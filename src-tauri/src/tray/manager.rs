use std::sync::Arc;
use tokio::sync::RwLock;

use crate::core::provider::ProviderId;
use crate::state::AppState;
use crate::tray::renderer;

/// Manages the system tray icon and its updates
pub struct TrayManager {
    /// Cached icon signature to avoid unnecessary redraws
    last_signature: Option<(u8, u8)>,
}

impl TrayManager {
    pub fn new() -> Self {
        Self {
            last_signature: None,
        }
    }

    /// Generate icon bytes for the current state
    pub async fn generate_icon(&mut self, state: &AppState) -> Option<Vec<u8>> {
        let snapshots = state.snapshots.read().await;
        let settings = state.settings.read().await;

        // Find the first enabled provider with data
        let mut session_pct = 0.0_f64;
        let mut weekly_pct = 0.0_f64;

        for id in ProviderId::all() {
            if !settings.is_provider_enabled(id) {
                continue;
            }
            if let Some(result) = snapshots.get(id) {
                if let Some(ref usage) = result.usage {
                    session_pct = usage.primary.used_percent;
                    if let Some(ref secondary) = usage.secondary {
                        weekly_pct = secondary.used_percent;
                    }
                    break;
                }
            }
        }

        // Quantize to 5% buckets to avoid unnecessary redraws
        let sig_session = (session_pct / 5.0).round() as u8;
        let sig_weekly = (weekly_pct / 5.0).round() as u8;
        let sig = (sig_session, sig_weekly);

        if self.last_signature == Some(sig) {
            return None; // No change
        }
        self.last_signature = Some(sig);

        Some(renderer::create_bar_icon(session_pct, weekly_pct))
    }

    /// Generate tooltip text
    pub async fn generate_tooltip(&self, state: &AppState) -> String {
        let snapshots = state.snapshots.read().await;
        let settings = state.settings.read().await;

        let mut lines = vec!["CodexBar".to_string()];

        for id in ProviderId::all() {
            if !settings.is_provider_enabled(id) {
                continue;
            }
            if let Some(result) = snapshots.get(id) {
                if let Some(ref usage) = result.usage {
                    let session = if settings.show_as_used {
                        format!("{:.0}% used", usage.primary.used_percent)
                    } else {
                        format!("{:.0}% left", usage.primary.remaining_percent())
                    };
                    lines.push(format!("{}: {}", id.display_name(), session));
                }
            }
        }

        if lines.len() == 1 {
            lines.push("No data yet".to_string());
        }

        lines.join("\n")
    }
}
