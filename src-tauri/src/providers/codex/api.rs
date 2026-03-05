use crate::core::provider::ProviderError;
use crate::core::rate_window::RateWindow;
use crate::core::usage_snapshot::{CostSnapshot, UsageSnapshot};

/// Fetch Codex usage via OAuth API
/// Reads auth from ~/.codex/auth.json or CODEX_HOME env
pub async fn fetch_codex_usage() -> Result<UsageSnapshot, ProviderError> {
    let auth_path = std::env::var("CODEX_HOME")
        .map(|h| std::path::PathBuf::from(h).join("auth.json"))
        .unwrap_or_else(|_| {
            dirs::home_dir()
                .unwrap_or_default()
                .join(".codex")
                .join("auth.json")
        });

    let auth_content = std::fs::read_to_string(&auth_path)
        .map_err(|_| ProviderError::AuthRequired("No Codex auth.json found".to_string()))?;

    let auth: serde_json::Value = serde_json::from_str(&auth_content)
        .map_err(|e| ProviderError::Parse(format!("Invalid auth.json: {}", e)))?;

    let token = auth
        .get("token")
        .or_else(|| auth.get("access_token"))
        .or_else(|| auth.get("accessToken"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| ProviderError::AuthRequired("No token in auth.json".to_string()))?;

    let client = reqwest::Client::new();
    let resp = client
        .get("https://chatgpt.com/backend-api/wham/usage")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if resp.status() == 401 || resp.status() == 403 {
        return Err(ProviderError::AuthRequired(
            "Codex token expired".to_string(),
        ));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| ProviderError::Parse(format!("Failed to parse response: {}", e)))?;

    parse_codex_response(&json)
}

fn parse_codex_response(json: &serde_json::Value) -> Result<UsageSnapshot, ProviderError> {
    let rate_limit = json
        .get("rate_limit")
        .or_else(|| json.get("rateLimit"))
        .ok_or_else(|| ProviderError::Parse("No rate_limit in response".to_string()))?;

    // Primary window (session/5-hour)
    let primary = rate_limit
        .get("primary_window")
        .or_else(|| rate_limit.get("primaryWindow"));

    let session_pct = primary
        .and_then(|w| {
            w.get("used_percent")
                .or_else(|| w.get("usedPercent"))
                .and_then(|v| v.as_f64())
        })
        .unwrap_or(0.0);

    let window_seconds = primary
        .and_then(|w| {
            w.get("limit_window_seconds")
                .or_else(|| w.get("limitWindowSeconds"))
                .and_then(|v| v.as_u64())
        })
        .unwrap_or(18000); // Default 5 hours

    let mut session = RateWindow::new(session_pct * 100.0)
        .with_window((window_seconds / 60) as u32);

    if let Some(reset_str) = primary
        .and_then(|w| w.get("reset_at").or_else(|| w.get("resetAt")))
        .and_then(|v| v.as_str())
    {
        if let Ok(reset) = chrono::DateTime::parse_from_rfc3339(reset_str) {
            session = session.with_reset(reset.with_timezone(&chrono::Utc));
        }
    }

    // Secondary window (weekly)
    let secondary = rate_limit
        .get("secondary_window")
        .or_else(|| rate_limit.get("secondaryWindow"));

    let weekly_pct = secondary
        .and_then(|w| {
            w.get("used_percent")
                .or_else(|| w.get("usedPercent"))
                .and_then(|v| v.as_f64())
        })
        .map(|v| v * 100.0);

    let mut snapshot = UsageSnapshot::new(session, "oauth");

    if let Some(wp) = weekly_pct {
        let mut weekly = RateWindow::new(wp).with_window(10080);
        if let Some(reset_str) = secondary
            .and_then(|w| w.get("reset_at").or_else(|| w.get("resetAt")))
            .and_then(|v| v.as_str())
        {
            if let Ok(reset) = chrono::DateTime::parse_from_rfc3339(reset_str) {
                weekly = weekly.with_reset(reset.with_timezone(&chrono::Utc));
            }
        }
        snapshot = snapshot.with_secondary(weekly);
    }

    // Plan info
    if let Some(plan) = json.get("plan_type").and_then(|v| v.as_str()) {
        snapshot = snapshot.with_plan(plan.to_string());
    }
    if let Some(email) = json.get("email").and_then(|v| v.as_str()) {
        snapshot = snapshot.with_email(email.to_string());
    }

    Ok(snapshot)
}
