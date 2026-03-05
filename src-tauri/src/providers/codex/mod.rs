pub mod api;

use crate::core::provider::{
    FetchContext, Provider, ProviderId, ProviderError, ProviderMetadata, SourceMode,
};
use crate::core::usage_snapshot::UsageSnapshot;

pub struct CodexProvider;

impl CodexProvider {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl Provider for CodexProvider {
    fn id(&self) -> ProviderId {
        ProviderId::Codex
    }

    fn metadata(&self) -> ProviderMetadata {
        ProviderMetadata {
            id: ProviderId::Codex,
            name: "Codex".to_string(),
            description: "OpenAI Codex coding assistant".to_string(),
            dashboard_url: ProviderId::Codex.dashboard_url().to_string(),
            supports_oauth: true,
            supports_cookies: false,
            supports_cli: true,
            supports_api_key: false,
        }
    }

    async fn fetch_usage(&self, ctx: &FetchContext) -> Result<UsageSnapshot, ProviderError> {
        match ctx.source_mode {
            SourceMode::Auto | SourceMode::OAuth => api::fetch_codex_usage().await,
            _ => Err(ProviderError::Other(
                "Unsupported source mode for Codex".to_string(),
            )),
        }
    }

    fn available_sources(&self) -> Vec<SourceMode> {
        vec![SourceMode::Auto, SourceMode::OAuth, SourceMode::Cli]
    }
}
