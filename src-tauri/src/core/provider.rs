use serde::{Deserialize, Serialize};
use std::fmt;

use super::usage_snapshot::UsageSnapshot;

/// Supported provider identifiers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderId {
    Codex,
    Claude,
    Cursor,
    Gemini,
    Copilot,
}

impl ProviderId {
    pub fn all() -> &'static [ProviderId] {
        &[
            ProviderId::Codex,
            ProviderId::Claude,
            ProviderId::Cursor,
            ProviderId::Gemini,
            ProviderId::Copilot,
        ]
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            ProviderId::Codex => "Codex",
            ProviderId::Claude => "Claude",
            ProviderId::Cursor => "Cursor",
            ProviderId::Gemini => "Gemini",
            ProviderId::Copilot => "Copilot",
        }
    }

    pub fn dashboard_url(&self) -> &'static str {
        match self {
            ProviderId::Codex => "https://platform.openai.com/usage",
            ProviderId::Claude => "https://claude.ai/settings/usage",
            ProviderId::Cursor => "https://www.cursor.com/settings",
            ProviderId::Gemini => "https://aistudio.google.com",
            ProviderId::Copilot => "https://github.com/settings/copilot",
        }
    }

    pub fn status_page_url(&self) -> Option<&'static str> {
        match self {
            ProviderId::Codex => Some("https://status.openai.com/api/v2/status.json"),
            ProviderId::Claude => Some("https://status.anthropic.com/api/v2/status.json"),
            ProviderId::Cursor => Some("https://status.cursor.com/api/v2/status.json"),
            ProviderId::Copilot => Some("https://www.githubstatus.com/api/v2/status.json"),
            ProviderId::Gemini => None,
        }
    }

    pub fn from_str_id(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "codex" | "openai" => Some(ProviderId::Codex),
            "claude" | "anthropic" => Some(ProviderId::Claude),
            "cursor" => Some(ProviderId::Cursor),
            "gemini" | "google" => Some(ProviderId::Gemini),
            "copilot" | "github" => Some(ProviderId::Copilot),
            _ => None,
        }
    }
}

impl fmt::Display for ProviderId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.display_name())
    }
}

/// Metadata about a provider
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderMetadata {
    pub id: ProviderId,
    pub name: String,
    pub description: String,
    pub dashboard_url: String,
    pub supports_oauth: bool,
    pub supports_cookies: bool,
    pub supports_cli: bool,
    pub supports_api_key: bool,
}

/// How the provider fetches data
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SourceMode {
    Auto,
    OAuth,
    Web,
    Cli,
    ApiKey,
}

/// Context passed to providers during fetch
pub struct FetchContext {
    pub source_mode: SourceMode,
    pub manual_cookie: Option<String>,
    pub api_key: Option<String>,
}

/// Errors that can occur during provider fetch
#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    #[error("Authentication required: {0}")]
    AuthRequired(String),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("CLI not found: {0}")]
    CliNotFound(String),

    #[error("Timeout")]
    Timeout,

    #[error("{0}")]
    Other(String),
}

/// Trait that all providers must implement
#[async_trait::async_trait]
pub trait Provider: Send + Sync {
    fn id(&self) -> ProviderId;
    fn metadata(&self) -> ProviderMetadata;
    async fn fetch_usage(&self, ctx: &FetchContext) -> Result<UsageSnapshot, ProviderError>;
    fn available_sources(&self) -> Vec<SourceMode>;
}
