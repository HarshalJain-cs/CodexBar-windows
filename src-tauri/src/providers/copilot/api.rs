use crate::core::provider::ProviderError;
use crate::core::rate_window::RateWindow;
use crate::core::usage_snapshot::UsageSnapshot;

/// Fetch Copilot usage via GitHub internal API
pub async fn fetch_copilot_usage(token: &str) -> Result<UsageSnapshot, ProviderError> {
    let client = reqwest::Client::new();

    let resp = client
        .get("https://api.github.com/copilot_internal/user")
        .header("Authorization", format!("token {}", token))
        .header("Editor-Version", "vscode/1.96.2")
        .header("Editor-Plugin-Version", "copilot-chat/0.26.7")
        .header("User-Agent", "GitHubCopilotChat/0.26.7")
        .header("Accept", "application/json")
        .send()
        .await?;

    if resp.status() == 401 || resp.status() == 403 {
        return Err(ProviderError::AuthRequired(
            "Copilot token expired. Re-authenticate via Settings.".to_string(),
        ));
    }

    if !resp.status().is_success() {
        return Err(ProviderError::Other(format!(
            "Copilot API returned {}",
            resp.status()
        )));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| ProviderError::Parse(format!("Failed to parse: {}", e)))?;

    parse_copilot_response(&json)
}

fn parse_copilot_response(json: &serde_json::Value) -> Result<UsageSnapshot, ProviderError> {
    let quota = json.get("quotaSnapshots");

    // Parse premium interactions
    let premium = quota
        .and_then(|q| q.get("premiumInteractions"))
        .or_else(|| quota.and_then(|q| q.get("premium_interactions")));

    let (premium_used, premium_limit) = if let Some(p) = premium {
        let used = p
            .get("used")
            .or_else(|| p.get("count"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let limit = p
            .get("limit")
            .or_else(|| p.get("quota"))
            .and_then(|v| v.as_f64())
            .unwrap_or(300.0); // Default Pro limit
        (used, limit)
    } else {
        (0.0, 300.0)
    };

    let premium_pct = if premium_limit > 0.0 {
        (premium_used / premium_limit * 100.0).min(100.0)
    } else {
        0.0
    };

    // Parse chat usage
    let chat = quota
        .and_then(|q| q.get("chat"))
        .or_else(|| quota.and_then(|q| q.get("chatInteractions")));

    let chat_pct = if let Some(c) = chat {
        let used = c
            .get("used")
            .or_else(|| c.get("count"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let limit = c
            .get("limit")
            .or_else(|| c.get("quota"))
            .and_then(|v| v.as_f64())
            .unwrap_or(100.0);
        if limit > 0.0 {
            (used / limit * 100.0).min(100.0)
        } else {
            0.0
        }
    } else {
        0.0
    };

    // Primary = premium interactions (monthly)
    let session = RateWindow::new(premium_pct)
        .with_window(43200) // Monthly
        .with_description(format!(
            "{:.0}/{:.0} premium requests",
            premium_used, premium_limit
        ));

    let mut snapshot = UsageSnapshot::new(session, "oauth");

    // Secondary = chat usage
    if chat.is_some() {
        let chat_window = RateWindow::new(chat_pct)
            .with_window(43200)
            .with_description("Chat usage".to_string());
        snapshot = snapshot.with_secondary(chat_window);
    }

    // Plan info
    if let Some(plan) = json
        .get("copilot_plan_type")
        .or_else(|| json.get("plan"))
        .and_then(|v| v.as_str())
    {
        snapshot = snapshot.with_plan(plan.to_string());
    }

    Ok(snapshot)
}
