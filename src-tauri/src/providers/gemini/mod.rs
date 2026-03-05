pub mod api;

use crate::core::provider::{
    FetchContext, Provider, ProviderId, ProviderError, ProviderMetadata, SourceMode,
};
use crate::core::usage_snapshot::UsageSnapshot;

pub struct GeminiProvider;

impl GeminiProvider {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl Provider for GeminiProvider {
    fn id(&self) -> ProviderId {
        ProviderId::Gemini
    }

    fn metadata(&self) -> ProviderMetadata {
        ProviderMetadata {
            id: ProviderId::Gemini,
            name: "Gemini".to_string(),
            description: "Google Gemini AI coding assistant".to_string(),
            dashboard_url: ProviderId::Gemini.dashboard_url().to_string(),
            supports_oauth: true,
            supports_cookies: false,
            supports_cli: true,
            supports_api_key: false,
        }
    }

    async fn fetch_usage(&self, ctx: &FetchContext) -> Result<UsageSnapshot, ProviderError> {
        api::fetch_gemini_usage().await
    }

    fn available_sources(&self) -> Vec<SourceMode> {
        vec![SourceMode::Auto, SourceMode::OAuth]
    }
}
