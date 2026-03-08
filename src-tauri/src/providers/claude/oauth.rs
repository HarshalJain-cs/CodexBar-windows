use crate::core::provider::ProviderError;
use crate::core::rate_window::RateWindow;
use crate::core::usage_snapshot::UsageSnapshot;

/// Fetch Claude usage via OAuth API
/// Reads credentials from ~/.claude/.credentials.json
pub async fn fetch_claude_oauth() -> Result<UsageSnapshot, ProviderError> {
    let creds = crate::core::credentials::read_home_json(".claude/.credentials.json")
        .ok_or_else(|| ProviderError::AuthRequired("No Claude credentials found".to_string()))?;

    let access_token = creds
        .get("accessToken")
        .or_else(|| creds.get("oauthAccessToken"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| ProviderError::AuthRequired("No access token in credentials".to_string()))?;

    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.anthropic.com/api/oauth/usage")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("anthropic-beta", "oauth-2025-04-20")
        .send()
        .await?;

    if resp.status() == 401 || resp.status() == 403 {
        return Err(ProviderError::AuthRequired(
            "Claude OAuth token expired or invalid".to_string(),
        ));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| ProviderError::Parse(format!("Failed to parse response: {}", e)))?;

    parse_claude_oauth_response(&json)
}

fn parse_claude_oauth_response(json: &serde_json::Value) -> Result<UsageSnapshot, ProviderError> {
    // Parse five_hour (session) window
    let five_hour = json.get("five_hour").or_else(|| json.get("fiveHour"));
    let session = parse_rate_window(five_hour, 300)?;

    // Parse seven_day (weekly) window
    let seven_day = json.get("seven_day").or_else(|| json.get("sevenDay"));
    let weekly = parse_rate_window(seven_day, 10080).ok();

    let mut snapshot = UsageSnapshot::new(session, "oauth");
    if let Some(w) = weekly {
        snapshot = snapshot.with_secondary(w);
    }

    // Parse account info
    if let Some(email) = json.get("email").and_then(|v| v.as_str()) {
        snapshot = snapshot.with_email(email.to_string());
    }
    if let Some(plan) = json.get("plan").and_then(|v| v.as_str()) {
        snapshot = snapshot.with_plan(plan.to_string());
    }

    Ok(snapshot)
}

fn parse_rate_window(
    window: Option<&serde_json::Value>,
    default_minutes: u32,
) -> Result<RateWindow, ProviderError> {
    let window = window.ok_or_else(|| ProviderError::Parse("Missing rate window".to_string()))?;

    let raw_value = window
        .get("used_percent")
        .or_else(|| window.get("usedPercent"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let mut rw = RateWindow::from_api_percent(raw_value).with_window(default_minutes);

    if let Some(reset_str) = window
        .get("resets_at")
        .or_else(|| window.get("resetsAt"))
        .and_then(|v| v.as_str())
    {
        if let Ok(reset) = chrono::DateTime::parse_from_rfc3339(reset_str) {
            rw = rw.with_reset(reset.with_timezone(&chrono::Utc));
        }
    }

    Ok(rw)
}
