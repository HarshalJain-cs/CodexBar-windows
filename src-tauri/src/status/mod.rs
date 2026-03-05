use serde::{Deserialize, Serialize};

use crate::core::provider::ProviderId;

/// Status level from Statuspage.io
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StatusLevel {
    Operational,
    DegradedPerformance,
    PartialOutage,
    MajorOutage,
    Unknown,
}

/// Provider operational status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderStatus {
    pub provider_id: String,
    pub level: StatusLevel,
    pub description: String,
}

/// Fetch status from a Statuspage.io endpoint
pub async fn fetch_statuspage(
    client: &reqwest::Client,
    provider_id: ProviderId,
) -> Option<ProviderStatus> {
    let url = provider_id.status_page_url()?;

    let resp = client.get(url).send().await.ok()?;
    let json: serde_json::Value = resp.json().await.ok()?;

    let indicator = json
        .get("status")?
        .get("indicator")?
        .as_str()
        .unwrap_or("unknown");

    let description = json
        .get("status")?
        .get("description")?
        .as_str()
        .unwrap_or("Unknown")
        .to_string();

    let level = match indicator {
        "none" => StatusLevel::Operational,
        "minor" => StatusLevel::DegradedPerformance,
        "major" => StatusLevel::PartialOutage,
        "critical" => StatusLevel::MajorOutage,
        _ => StatusLevel::Unknown,
    };

    Some(ProviderStatus {
        provider_id: format!("{:?}", provider_id).to_lowercase(),
        level,
        description,
    })
}
