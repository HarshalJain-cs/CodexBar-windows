use crate::core::provider::ProviderError;
use crate::core::rate_window::RateWindow;
use crate::core::usage_snapshot::UsageSnapshot;

/// Fetch Cursor usage via Web API with browser cookies
pub async fn fetch_cursor_usage(cookie: &str) -> Result<UsageSnapshot, ProviderError> {
    let client = reqwest::Client::new();

    let resp = client
        .get("https://www.cursor.com/api/usage")
        .header("Cookie", cookie)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        .send()
        .await?;

    if resp.status() == 401 || resp.status() == 403 {
        return Err(ProviderError::AuthRequired(
            "Cursor session cookie expired".to_string(),
        ));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| ProviderError::Parse(format!("Failed to parse response: {}", e)))?;

    parse_cursor_response(&json)
}

fn parse_cursor_response(json: &serde_json::Value) -> Result<UsageSnapshot, ProviderError> {
    // Cursor returns usage in various formats, try to parse flexibly
    let requests_used = json
        .get("numRequestsTotal")
        .or_else(|| json.get("numRequests"))
        .or_else(|| json.get("requests_used"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let requests_limit = json
        .get("maxRequestUsage")
        .or_else(|| json.get("requestLimit"))
        .or_else(|| json.get("requests_limit"))
        .and_then(|v| v.as_f64())
        .unwrap_or(500.0); // Default Pro plan limit

    let used_percent = if requests_limit > 0.0 {
        (requests_used / requests_limit * 100.0).min(100.0)
    } else {
        0.0
    };

    // Monthly window (Cursor resets monthly)
    let session = RateWindow::new(used_percent)
        .with_window(43200) // ~30 days in minutes
        .with_description(format!(
            "{:.0}/{:.0} requests",
            requests_used, requests_limit
        ));

    let mut snapshot = UsageSnapshot::new(session, "web");

    // Plan info
    if let Some(plan) = json
        .get("plan")
        .or_else(|| json.get("membershipType"))
        .and_then(|v| v.as_str())
    {
        snapshot = snapshot.with_plan(plan.to_string());
    }

    Ok(snapshot)
}
