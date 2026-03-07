pub mod oauth;
pub mod web_api;

use crate::core::provider::{
    FetchContext, Provider, ProviderId, ProviderError, ProviderMetadata, SourceMode,
};
use crate::core::usage_snapshot::UsageSnapshot;

pub struct ClaudeProvider;

impl ClaudeProvider {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl Provider for ClaudeProvider {
    fn id(&self) -> ProviderId {
        ProviderId::Claude
    }

    fn metadata(&self) -> ProviderMetadata {
        ProviderMetadata {
            id: ProviderId::Claude,
            name: "Claude".to_string(),
            description: "Anthropic Claude AI assistant".to_string(),
            dashboard_url: ProviderId::Claude.dashboard_url().to_string(),
            supports_oauth: true,
            supports_cookies: true,
            supports_cli: true,
            supports_api_key: false,
        }
    }

    async fn fetch_usage(&self, ctx: &FetchContext) -> Result<UsageSnapshot, ProviderError> {
        // Try strategies in priority order based on source mode
        match ctx.source_mode {
            SourceMode::OAuth | SourceMode::Auto => {
                // Try OAuth first
                match oauth::fetch_claude_oauth().await {
                    Ok(snapshot) => return Ok(snapshot),
                    Err(e) => {
                        if ctx.source_mode == SourceMode::OAuth {
                            return Err(e);
                        }
                        tracing::debug!("Claude OAuth failed, trying web: {}", e);
                    }
                }

                // Fallback to web API with cookies
                let cookie = if let Some(ref manual) = ctx.manual_cookie {
                    manual.clone()
                } else {
                    crate::browser::cookies::extract_cookies_for_domain("claude.ai")
                        .await
                        .map_err(ProviderError::AuthRequired)?
                };

                web_api::fetch_claude_web(&cookie).await
            }
            SourceMode::Web => {
                let cookie = if let Some(ref manual) = ctx.manual_cookie {
                    manual.clone()
                } else {
                    crate::browser::cookies::extract_cookies_for_domain("claude.ai")
                        .await
                        .map_err(ProviderError::AuthRequired)?
                };
                web_api::fetch_claude_web(&cookie).await
            }
            SourceMode::Cli => {
                Err(ProviderError::Other("CLI mode not yet implemented".to_string()))
            }
            SourceMode::ApiKey => {
                Err(ProviderError::Other("Claude does not support API key mode".to_string()))
            }
        }
    }

    fn available_sources(&self) -> Vec<SourceMode> {
        vec![SourceMode::Auto, SourceMode::OAuth, SourceMode::Web, SourceMode::Cli]
    }
}
