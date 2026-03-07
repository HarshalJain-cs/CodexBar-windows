use crate::core::provider::ProviderId;
use crate::core::rate_window::UsageLevel;
use crate::sound;
use crate::state::AppState;
use std::collections::HashMap;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Tracks which notifications have been sent to avoid duplicates.
/// Also tracks session depletion/restoration transitions.
#[derive(Default)]
pub struct NotificationTracker {
    last_notified: HashMap<ProviderId, UsageLevel>,
    was_depleted: HashMap<ProviderId, bool>,
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

        let sound_on = settings.sound_enabled;
        let snapshots = state.snapshots.read().await;

        for (id, result) in snapshots.iter() {
            if let Some(ref usage) = result.usage {
                let level = usage.primary.usage_level();
                let is_depleted = usage.primary.is_exhausted();
                let was = self.was_depleted.get(id).copied().unwrap_or(false);

                // Session depleted/restored detection
                if is_depleted && !was {
                    self.send_notification(
                        app_handle,
                        &format!("{} session depleted", id.display_name()),
                        "Your session quota is fully used. It will reset soon.",
                    );
                    if sound_on { sound::play_critical(); }
                    self.was_depleted.insert(*id, true);
                } else if !is_depleted && was {
                    self.send_notification(
                        app_handle,
                        &format!("{} session restored", id.display_name()),
                        "Your session quota has been restored!",
                    );
                    if sound_on { sound::play_success(); }
                    self.was_depleted.insert(*id, false);
                }

                // Threshold crossing notifications
                let last = self.last_notified.get(id);
                let should_notify = match (last, &level) {
                    (None, UsageLevel::High) | (None, UsageLevel::Critical) => true,
                    (Some(UsageLevel::Low), UsageLevel::High)
                    | (Some(UsageLevel::Low), UsageLevel::Critical)
                    | (Some(UsageLevel::Medium), UsageLevel::High)
                    | (Some(UsageLevel::Medium), UsageLevel::Critical)
                    | (Some(UsageLevel::High), UsageLevel::Critical) => true,
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
                        UsageLevel::Critical => {
                            if sound_on { sound::play_critical(); }
                            (
                                format!("{} usage critical!", name),
                                format!(
                                    "Only {:.0}% remaining. Consider slowing down.",
                                    remaining
                                ),
                            )
                        }
                        UsageLevel::High => {
                            if sound_on { sound::play_warning(); }
                            (
                                format!("{} usage high", name),
                                format!(
                                    "{:.0}% used ({:.0}% remaining).",
                                    used_pct, remaining
                                ),
                            )
                        }
                        _ => continue,
                    };

                    self.send_notification(app_handle, &title, &body);
                    self.last_notified.insert(*id, level);
                }
            }
        }
    }

    fn send_notification(&self, app_handle: &AppHandle, title: &str, body: &str) {
        if let Err(e) = app_handle
            .notification()
            .builder()
            .title(title)
            .body(body)
            .show()
        {
            tracing::warn!("Failed to send notification: {}", e);
        }
    }
}
