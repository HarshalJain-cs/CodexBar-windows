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
    http_client: Option<reqwest::Client>,
}

impl NotificationTracker {
    pub fn new() -> Self {
        Self {
            http_client: Some(reqwest::Client::new()),
            ..Default::default()
        }
    }

    /// Check usage thresholds and send notifications for providers that crossed them
    pub async fn check_and_notify(&mut self, app_handle: &AppHandle, state: &AppState) {
        let settings = state.settings.read().await;
        if !settings.notifications_enabled {
            return;
        }

        let sound_on = settings.sound_enabled;
        let webhook_url = if settings.webhook_enabled && !settings.webhook_url.is_empty() {
            Some(settings.webhook_url.clone())
        } else {
            None
        };
        let snapshots = state.snapshots.read().await;

        for (id, result) in snapshots.iter() {
            if let Some(ref usage) = result.usage {
                let level = usage.primary.usage_level();
                let is_depleted = usage.primary.is_exhausted();
                let was = self.was_depleted.get(id).copied().unwrap_or(false);

                // Session depleted/restored detection
                if is_depleted && !was {
                    let title = format!("{} session depleted", id.display_name());
                    let body = "Your session quota is fully used. It will reset soon.".to_string();
                    self.send_notification(app_handle, &title, &body);
                    if let Some(ref url) = webhook_url {
                        self.send_webhook(url, &title, &body).await;
                    }
                    if sound_on { sound::play_critical(); }
                    self.was_depleted.insert(*id, true);
                } else if !is_depleted && was {
                    let title = format!("{} session restored", id.display_name());
                    let body = "Your session quota has been restored!".to_string();
                    self.send_notification(app_handle, &title, &body);
                    if let Some(ref url) = webhook_url {
                        self.send_webhook(url, &title, &body).await;
                    }
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
                    if let Some(ref url) = webhook_url {
                        self.send_webhook(url, &title, &body).await;
                    }
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

    /// Send a webhook notification (supports Discord and Slack webhook formats)
    async fn send_webhook(&self, url: &str, title: &str, body: &str) {
        let client = match &self.http_client {
            Some(c) => c,
            None => return,
        };

        // Detect webhook type and format payload accordingly
        let payload = if url.contains("discord.com/api/webhooks") {
            // Discord webhook format
            serde_json::json!({
                "embeds": [{
                    "title": format!("CodexBar: {}", title),
                    "description": body,
                    "color": if title.contains("critical") || title.contains("depleted") { 15158332 } else { 16776960 },
                    "footer": { "text": "CodexBar AI Usage Monitor" }
                }]
            })
        } else if url.contains("hooks.slack.com") {
            // Slack webhook format
            serde_json::json!({
                "text": format!("*CodexBar: {}*\n{}", title, body),
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": format!("*CodexBar: {}*\n{}", title, body)
                        }
                    }
                ]
            })
        } else {
            // Generic webhook (JSON POST)
            serde_json::json!({
                "title": title,
                "body": body,
                "source": "CodexBar",
                "timestamp": chrono::Utc::now().to_rfc3339()
            })
        };

        match client.post(url).json(&payload).send().await {
            Ok(resp) => {
                if !resp.status().is_success() {
                    tracing::warn!("Webhook returned {}: {}", resp.status(), url);
                }
            }
            Err(e) => {
                tracing::warn!("Failed to send webhook: {}", e);
            }
        }
    }
}

/// Tauri command to test webhook connectivity
#[tauri::command]
pub async fn test_webhook(url: String) -> Result<String, String> {
    let client = reqwest::Client::new();

    let payload = if url.contains("discord.com/api/webhooks") {
        serde_json::json!({
            "embeds": [{
                "title": "CodexBar: Test Notification",
                "description": "Webhook connection successful! You'll receive alerts here.",
                "color": 5025616,
                "footer": { "text": "CodexBar AI Usage Monitor" }
            }]
        })
    } else if url.contains("hooks.slack.com") {
        serde_json::json!({
            "text": "*CodexBar: Test Notification*\nWebhook connection successful! You'll receive alerts here."
        })
    } else {
        serde_json::json!({
            "title": "CodexBar: Test Notification",
            "body": "Webhook connection successful!",
            "source": "CodexBar"
        })
    };

    match client.post(&url).json(&payload).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok("Webhook test successful!".to_string())
            } else {
                Err(format!("Webhook returned status {}", resp.status()))
            }
        }
        Err(e) => Err(format!("Failed to reach webhook: {}", e)),
    }
}
