use crate::core::provider::ProviderId;
use crate::core::rate_window::UsageLevel;
use crate::state::AppState;
use std::collections::HashMap;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Tracks which notifications have been sent to avoid duplicates
#[derive(Default)]
pub struct NotificationTracker {
    last_notified: HashMap<ProviderId, UsageLevel>,
}

impl NotificationTracker {
    pub fn new() -> Self {
        Self::default()
    }

    /// Check usage thresholds and send notifications for providers that crossed them
    pub async fn check_and_notify(&mut self, app_handle: &AppHandle, state: &AppState) {
        let settings = state.settings.read().await;
        if !settings.notifications_enabled {
            return;
        }

        let snapshots = state.snapshots.read().await;

        for (id, result) in snapshots.iter() {
            if let Some(ref usage) = result.usage {
                let level = usage.primary.usage_level();
                let last = self.last_notified.get(id);

                let should_notify = match (last, &level) {
                    // First time seeing High or Critical
                    (None, UsageLevel::High) | (None, UsageLevel::Critical) => true,
                    // Escalation from lower levels
                    (Some(UsageLevel::Low), UsageLevel::High)
                    | (Some(UsageLevel::Low), UsageLevel::Critical)
                    | (Some(UsageLevel::Medium), UsageLevel::High)
                    | (Some(UsageLevel::Medium), UsageLevel::Critical)
                    | (Some(UsageLevel::High), UsageLevel::Critical) => true,
                    // Reset: usage dropped back to Low, clear tracking
                    (Some(_), UsageLevel::Low) => {
                        self.last_notified.remove(id);
                        false
                    }
                    _ => false,
                };

                if should_notify {
                    let name = id.display_name();
                    let used_pct = usage.primary.used_percent;
                    let remaining = 100.0 - used_pct;

                    let (title, body) = match level {
                        UsageLevel::Critical => (
                            format!("{} usage critical!", name),
                            format!(
                                "Only {:.0}% remaining. Consider slowing down.",
                                remaining
                            ),
                        ),
                        UsageLevel::High => (
                            format!("{} usage high", name),
                            format!(
                                "{:.0}% used ({:.0}% remaining).",
                                used_pct, remaining
                            ),
                        ),
                        _ => continue,
                    };

                    if let Err(e) = app_handle
                        .notification()
                        .builder()
                        .title(&title)
                        .body(&body)
                        .show()
                    {
                        tracing::warn!("Failed to send notification: {}", e);
                    }

                    self.last_notified.insert(*id, level);
                }
            }
        }
    }
}
