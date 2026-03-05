pub mod api;
pub mod device_flow;

use crate::core::provider::{
    FetchContext, Provider, ProviderId, ProviderError, ProviderMetadata, SourceMode,
};
use crate::core::usage_snapshot::UsageSnapshot;

pub struct CopilotProvider;

impl CopilotProvider {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl Provider for CopilotProvider {
    fn id(&self) -> ProviderId {
        ProviderId::Copilot
    }

    fn metadata(&self) -> ProviderMetadata {
        ProviderMetadata {
            id: ProviderId::Copilot,
            name: "Copilot".to_string(),
            description: "GitHub Copilot AI pair programmer".to_string(),
            dashboard_url: ProviderId::Copilot.dashboard_url().to_string(),
            supports_oauth: true,
            supports_cookies: false,
            supports_cli: false,
            supports_api_key: true,
        }
    }

    async fn fetch_usage(&self, ctx: &FetchContext) -> Result<UsageSnapshot, ProviderError> {
        // Try API key first, then stored credential
        let token = if let Some(ref key) = ctx.api_key {
            key.clone()
        } else {
            let store = crate::core::credentials::CredentialStore::new();
            store
                .get("copilot_token")
                .map_err(|e| ProviderError::Other(e))?
                .ok_or_else(|| {
                    ProviderError::AuthRequired(
                        "No Copilot token. Use Settings to sign in with GitHub.".to_string(),
                    )
                })?
        };

        api::fetch_copilot_usage(&token).await
    }

    fn available_sources(&self) -> Vec<SourceMode> {
        vec![SourceMode::Auto, SourceMode::OAuth, SourceMode::ApiKey]
    }
}
