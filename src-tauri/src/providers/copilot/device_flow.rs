use serde::{Deserialize, Serialize};

use crate::core::provider::ProviderError;

/// VS Code's public OAuth client ID for Copilot
const GITHUB_CLIENT_ID: &str = "Iv1.b507a08c87ecfe98";

/// Data returned when initiating a device flow
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

/// Start the GitHub device flow for Copilot authentication
pub async fn start_device_flow() -> Result<DeviceCodeResponse, ProviderError> {
    let client = reqwest::Client::new();

    let resp = client
        .post("https://github.com/login/device/code")
        .header("Accept", "application/json")
        .form(&[
            ("client_id", GITHUB_CLIENT_ID),
            ("scope", "read:user"),
        ])
        .send()
        .await?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| ProviderError::Parse(format!("Failed to parse device code: {}", e)))?;

    Ok(DeviceCodeResponse {
        device_code: json["device_code"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        user_code: json["user_code"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        verification_uri: json["verification_uri"]
            .as_str()
            .unwrap_or("https://github.com/login/device")
            .to_string(),
        expires_in: json["expires_in"].as_u64().unwrap_or(900),
        interval: json["interval"].as_u64().unwrap_or(5),
    })
}

/// Poll GitHub for the access token after user authorizes
/// Returns Some(token) when authorized, None if still pending
pub async fn poll_for_token(device_code: &str) -> Result<Option<String>, ProviderError> {
    let client = reqwest::Client::new();

    let resp = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .form(&[
            ("client_id", GITHUB_CLIENT_ID),
            ("device_code", device_code),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .send()
        .await?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| ProviderError::Parse(format!("Failed to parse token response: {}", e)))?;

    if let Some(token) = json.get("access_token").and_then(|v| v.as_str()) {
        // Store in Windows Credential Manager
        let store = crate::core::credentials::CredentialStore::new();
        let _ = store.set("copilot_token", token);
        return Ok(Some(token.to_string()));
    }

    if let Some(error) = json.get("error").and_then(|v| v.as_str()) {
        match error {
            "authorization_pending" => Ok(None),
            "slow_down" => Ok(None),
            "expired_token" => Err(ProviderError::Other(
                "Device code expired. Please try again.".to_string(),
            )),
            "access_denied" => Err(ProviderError::Other(
                "Access denied by user.".to_string(),
            )),
            _ => Err(ProviderError::Other(format!("GitHub error: {}", error))),
        }
    } else {
        Ok(None)
    }
}
