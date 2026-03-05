use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Represents a single usage rate window (e.g., 5-hour session, weekly)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RateWindow {
    /// Usage percentage (0.0 - 100.0)
    pub used_percent: f64,
    /// Window duration in minutes (300 = 5h, 10080 = 7 days)
    pub window_minutes: Option<u32>,
    /// When this window resets
    pub resets_at: Option<DateTime<Utc>>,
    /// Human-readable reset description
    pub reset_description: Option<String>,
}

impl RateWindow {
    pub fn new(used_percent: f64) -> Self {
        Self {
            used_percent: used_percent.clamp(0.0, 100.0),
            window_minutes: None,
            resets_at: None,
            reset_description: None,
        }
    }

    pub fn with_window(mut self, minutes: u32) -> Self {
        self.window_minutes = Some(minutes);
        self
    }

    pub fn with_reset(mut self, resets_at: DateTime<Utc>) -> Self {
        self.resets_at = Some(resets_at);
        self
    }

    pub fn with_description(mut self, desc: String) -> Self {
        self.reset_description = Some(desc);
        self
    }

    pub fn remaining_percent(&self) -> f64 {
        (100.0 - self.used_percent).max(0.0)
    }

    pub fn is_exhausted(&self) -> bool {
        self.used_percent >= 100.0
    }

    /// Format the countdown until reset as a human-readable string
    pub fn format_countdown(&self) -> String {
        match self.resets_at {
            Some(reset) => {
                let now = Utc::now();
                if reset <= now {
                    return "Resetting now".to_string();
                }
                let dur = reset - now;
                let hours = dur.num_hours();
                let mins = dur.num_minutes() % 60;
                if hours > 24 {
                    let days = hours / 24;
                    format!("{}d {}h", days, hours % 24)
                } else if hours > 0 {
                    format!("{}h {}m", hours, mins)
                } else {
                    format!("{}m", mins)
                }
            }
            None => "Unknown".to_string(),
        }
    }

    /// Get usage level for color coding
    pub fn usage_level(&self) -> UsageLevel {
        match self.used_percent {
            p if p >= 95.0 => UsageLevel::Critical,
            p if p >= 80.0 => UsageLevel::High,
            p if p >= 50.0 => UsageLevel::Medium,
            _ => UsageLevel::Low,
        }
    }
}

impl Default for RateWindow {
    fn default() -> Self {
        Self::new(0.0)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UsageLevel {
    Low,
    Medium,
    High,
    Critical,
}
