use crate::core::provider::ProviderError;
use crate::core::rate_window::RateWindow;
use crate::core::usage_snapshot::UsageSnapshot;

/// Fetch Gemini usage via OAuth credentials
pub async fn fetch_gemini_usage() -> Result<UsageSnapshot, ProviderError> {
    // Try to read Gemini CLI OAuth credentials
    let creds_path = dirs::home_dir()
        .unwrap_or_default()
        .join(".gemini")
        .join("oauth_creds.json");

    let creds_content = std::fs::read_to_string(&creds_path).map_err(|_| {
        ProviderError::AuthRequired("No Gemini OAuth credentials found. Install and authenticate with the Gemini CLI.".to_string())
    })?;

    let creds: serde_json::Value = serde_json::from_str(&creds_content)
        .map_err(|e| ProviderError::Parse(format!("Invalid credentials: {}", e)))?;

    let access_token = creds
        .get("access_token")
        .or_else(|| creds.get("accessToken"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| ProviderError::AuthRequired("No access token".to_string()))?;

    // Verify credentials by listing models
    let client = reqwest::Client::new();
    let resp = client
        .get("https://generativelanguage.googleapis.com/v1beta/models")
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await?;

    if resp.status() == 401 || resp.status() == 403 {
        return Err(ProviderError::AuthRequired(
            "Gemini token expired. Re-authenticate with Gemini CLI.".to_string(),
        ));
    }

    // Check for rate limit headers that might indicate usage
    let rate_limit_remaining = resp
        .headers()
        .get("x-ratelimit-remaining")
        .or_else(|| resp.headers().get("x-ratelimit-remaining-requests"))
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<f64>().ok());

    let rate_limit_total = resp
        .headers()
        .get("x-ratelimit-limit")
        .or_else(|| resp.headers().get("x-ratelimit-limit-requests"))
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<f64>().ok());

    let _json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| ProviderError::Parse(format!("Failed to parse: {}", e)))?;

    // Calculate usage from rate limit headers if available
    let used_pct = match (rate_limit_remaining, rate_limit_total) {
        (Some(remaining), Some(total)) if total > 0.0 => {
            ((total - remaining) / total) * 100.0
        }
        _ => {
            // No rate limit data available — return -1 to signal "connected but no data"
            // The frontend can display "Connected" instead of a percentage
            -1.0
        }
    };

    let session = if used_pct < 0.0 {
        // Connected but no quota data available
        RateWindow::new(0.0)
            .with_window(1440) // Daily
            .with_description("Connected — no quota data available".to_string())
    } else {
        RateWindow::new(used_pct)
            .with_window(1440) // Daily
            .with_description(format!(
                "{:.0}% of daily quota used",
                used_pct
            ))
    };

    let mut snapshot = UsageSnapshot::new(session, "oauth");
    snapshot = snapshot.with_plan("Gemini".to_string());

    Ok(snapshot)
}
