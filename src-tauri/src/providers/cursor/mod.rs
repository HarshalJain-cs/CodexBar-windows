pub mod api;

use crate::core::provider::{
    FetchContext, Provider, ProviderId, ProviderError, ProviderMetadata, SourceMode,
};
use crate::core::usage_snapshot::UsageSnapshot;

pub struct CursorProvider;

impl CursorProvider {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl Provider for CursorProvider {
    fn id(&self) -> ProviderId {
        ProviderId::Cursor
    }

    fn metadata(&self) -> ProviderMetadata {
        ProviderMetadata {
            id: ProviderId::Cursor,
            name: "Cursor".to_string(),
            description: "Cursor AI code editor".to_string(),
            dashboard_url: ProviderId::Cursor.dashboard_url().to_string(),
            supports_oauth: false,
            supports_cookies: true,
            supports_cli: false,
            supports_api_key: false,
        }
    }

    async fn fetch_usage(&self, ctx: &FetchContext) -> Result<UsageSnapshot, ProviderError> {
        let cookie = if let Some(ref manual) = ctx.manual_cookie {
            manual.clone()
        } else {
            crate::browser::cookies::extract_cookies_for_domain("cursor.com")
                .await
                .map_err(|e| ProviderError::AuthRequired(e))?
        };

        api::fetch_cursor_usage(&cookie).await
    }

    fn available_sources(&self) -> Vec<SourceMode> {
        vec![SourceMode::Auto, SourceMode::Web]
    }
}
