use crate::core::provider::ProviderError;
use crate::core::rate_window::RateWindow;
use crate::core::usage_snapshot::UsageSnapshot;

/// Fetch Gemini usage via gcloud OAuth credentials
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

    // Try Gemini quota API
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

    // For now, return a basic snapshot since Gemini's quota API format varies
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| ProviderError::Parse(format!("Failed to parse: {}", e)))?;

    // Basic parsing - Gemini's API doesn't always expose quota directly
    let session = RateWindow::new(0.0)
        .with_window(1440) // Daily
        .with_description("Connected".to_string());

    let mut snapshot = UsageSnapshot::new(session, "oauth");
    snapshot = snapshot.with_plan("Gemini".to_string());

    Ok(snapshot)
}
