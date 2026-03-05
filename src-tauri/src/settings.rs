use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

use crate::core::provider::{ProviderId, SourceMode};

/// Application settings, persisted to %APPDATA%/CodexBar/settings.json
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// Enabled providers
    pub enabled_providers: HashSet<String>,
    /// Refresh interval in seconds
    pub refresh_interval_secs: u64,
    /// Per-provider source mode
    pub provider_sources: HashMap<String, SourceMode>,
    /// Manual cookies per provider
    pub manual_cookies: HashMap<String, String>,
    /// API keys per provider
    pub api_keys: HashMap<String, String>,
    /// Show usage as "used" (true) or "remaining" (false)
    pub show_as_used: bool,
    /// Reset time display: "relative" or "absolute"
    pub reset_time_format: String,
    /// Show notifications
    pub notifications_enabled: bool,
    /// Warning threshold (0-100)
    pub warning_threshold: f64,
    /// Critical threshold (0-100)
    pub critical_threshold: f64,
    /// Launch at Windows startup
    pub start_at_login: bool,
    /// Global keyboard shortcut
    pub global_shortcut: String,
    /// Enable tray icon animations
    pub animations_enabled: bool,
    /// Privacy mode (hide emails/org names)
    pub privacy_mode: bool,
    /// Enable system sounds for alerts
    #[serde(default = "default_true")]
    pub sound_enabled: bool,
    /// Update channel: "stable" or "beta"
    #[serde(default = "default_stable")]
    pub update_channel: String,
}

fn default_true() -> bool { true }
fn default_stable() -> String { "stable".to_string() }

impl Default for Settings {
    fn default() -> Self {
        let mut enabled = HashSet::new();
        enabled.insert("claude".to_string());
        enabled.insert("codex".to_string());

        Self {
            enabled_providers: enabled,
            refresh_interval_secs: 300,
            provider_sources: HashMap::new(),
            manual_cookies: HashMap::new(),
            api_keys: HashMap::new(),
            show_as_used: false,
            reset_time_format: "relative".to_string(),
            notifications_enabled: true,
            warning_threshold: 70.0,
            critical_threshold: 90.0,
            start_at_login: false,
            global_shortcut: "Ctrl+Shift+U".to_string(),
            animations_enabled: true,
            privacy_mode: false,
            sound_enabled: true,
            update_channel: "stable".to_string(),
        }
    }
}

impl Settings {
    /// Get the settings file path
    pub fn settings_path() -> PathBuf {
        let app_data = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        app_data.join("CodexBar").join("settings.json")
    }

    /// Load settings from disk
    pub fn load() -> Self {
        let path = Self::settings_path();
        if let Ok(content) = std::fs::read_to_string(&path) {
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Self::default()
        }
    }

    /// Save settings to disk
    pub fn save(&self) -> Result<(), String> {
        let path = Self::settings_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create settings dir: {}", e))?;
        }
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        std::fs::write(&path, json)
            .map_err(|e| format!("Failed to write settings: {}", e))
    }

    /// Check if a provider is enabled
    pub fn is_provider_enabled(&self, id: &ProviderId) -> bool {
        let key = format!("{:?}", id).to_lowercase();
        self.enabled_providers.contains(&key)
    }

    /// Get source mode for a provider
    pub fn get_source_mode(&self, id: &ProviderId) -> SourceMode {
        let key = format!("{:?}", id).to_lowercase();
        self.provider_sources
            .get(&key)
            .copied()
            .unwrap_or(SourceMode::Auto)
    }

    /// Get manual cookie for a provider
    pub fn get_manual_cookie(&self, id: &ProviderId) -> Option<&String> {
        let key = format!("{:?}", id).to_lowercase();
        self.manual_cookies.get(&key)
    }

    /// Get API key for a provider
    pub fn get_api_key(&self, id: &ProviderId) -> Option<&String> {
        let key = format!("{:?}", id).to_lowercase();
        self.api_keys.get(&key)
    }
}
