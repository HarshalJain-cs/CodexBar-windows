pub mod claude;
pub mod codex;
pub mod copilot;
pub mod cursor;
pub mod gemini;

use crate::core::provider::{FetchContext, Provider, ProviderId, ProviderError};
use crate::core::usage_snapshot::UsageSnapshot;

/// Create a provider instance by ID
pub fn create_provider(id: ProviderId) -> Box<dyn Provider> {
    match id {
        ProviderId::Claude => Box::new(claude::ClaudeProvider::new()),
        ProviderId::Codex => Box::new(codex::CodexProvider::new()),
        ProviderId::Cursor => Box::new(cursor::CursorProvider::new()),
        ProviderId::Gemini => Box::new(gemini::GeminiProvider::new()),
        ProviderId::Copilot => Box::new(copilot::CopilotProvider::new()),
    }
}

/// Fetch usage for a provider with the given context
pub async fn fetch_provider_usage(
    id: ProviderId,
    ctx: &FetchContext,
) -> Result<UsageSnapshot, ProviderError> {
    let provider = create_provider(id);
    provider.fetch_usage(ctx).await
}
