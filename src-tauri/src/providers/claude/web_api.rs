use crate::core::provider::ProviderError;
use crate::core::rate_window::RateWindow;
use crate::core::usage_snapshot::UsageSnapshot;

/// Fetch Claude usage via Web API using browser cookies
pub async fn fetch_claude_web(cookie: &str) -> Result<UsageSnapshot, ProviderError> {
    let client = reqwest::Client::new();

    // Step 1: Get organizations
    let orgs_resp = client
        .get("https://claude.ai/api/organizations")
        .header("Cookie", cookie)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .send()
        .await?;

    if orgs_resp.status() == 401 || orgs_resp.status() == 403 {
        return Err(ProviderError::AuthRequired(
            "Claude session cookie expired".to_string(),
        ));
    }

    let orgs: serde_json::Value = orgs_resp
        .json()
        .await
        .map_err(|e| ProviderError::Parse(format!("Failed to parse orgs: {}", e)))?;

    // Find the first organization UUID
    let org_id = orgs
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|org| org.get("uuid").or_else(|| org.get("id")))
        .and_then(|v| v.as_str())
        .ok_or_else(|| ProviderError::Parse("No organization found".to_string()))?;

    // Step 2: Get usage for this organization
    let usage_url = format!("https://claude.ai/api/organizations/{}/usage", org_id);
    let usage_resp = client
        .get(&usage_url)
        .header("Cookie", cookie)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .send()
        .await?;

    let usage: serde_json::Value = usage_resp
        .json()
        .await
        .map_err(|e| ProviderError::Parse(format!("Failed to parse usage: {}", e)))?;

    parse_claude_web_usage(&usage, &orgs)
}

fn parse_claude_web_usage(
    usage: &serde_json::Value,
    orgs: &serde_json::Value,
) -> Result<UsageSnapshot, ProviderError> {
    // Parse session window
    let session_raw = usage
        .get("daily_usage_percent")
        .or_else(|| usage.get("dailyUsagePercent"))
        .or_else(|| usage.get("five_hour_usage_percent"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let session = RateWindow::from_api_percent(session_raw).with_window(300);

    // Parse weekly window
    let weekly_raw = usage
        .get("weekly_usage_percent")
        .or_else(|| usage.get("weeklyUsagePercent"))
        .and_then(|v| v.as_f64());

    let mut snapshot = UsageSnapshot::new(session, "web");

    if let Some(wp) = weekly_raw {
        snapshot = snapshot.with_secondary(RateWindow::from_api_percent(wp).with_window(10080));
    }

    // Extract account info from orgs
    if let Some(org) = orgs.as_array().and_then(|arr| arr.first()) {
        if let Some(name) = org.get("name").and_then(|v| v.as_str()) {
            snapshot = snapshot.with_org(name.to_string());
        }
    }

    Ok(snapshot)
}
