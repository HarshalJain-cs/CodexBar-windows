use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::rate_window::RateWindow;

/// Complete usage data for a single provider
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSnapshot {
    /// Primary rate window (e.g., 5-hour session)
    pub primary: RateWindow,
    /// Secondary rate window (e.g., weekly)
    pub secondary: Option<RateWindow>,
    /// Model-specific rate window (e.g., Opus quota)
    pub model_specific: Option<RateWindow>,
    /// Account email
    pub account_email: Option<String>,
    /// Account organization
    pub account_org: Option<String>,
    /// Plan name (e.g., "Pro", "Max", "Team")
    pub account_plan: Option<String>,
    /// How the data was fetched
    pub source_label: String,
    /// When this data was fetched
    pub updated_at: DateTime<Utc>,
}

impl UsageSnapshot {
    pub fn new(primary: RateWindow, source: &str) -> Self {
        Self {
            primary,
            secondary: None,
            model_specific: None,
            account_email: None,
            account_org: None,
            account_plan: None,
            source_label: source.to_string(),
            updated_at: Utc::now(),
        }
    }

    pub fn with_secondary(mut self, secondary: RateWindow) -> Self {
        self.secondary = Some(secondary);
        self
    }

    pub fn with_model_specific(mut self, model: RateWindow) -> Self {
        self.model_specific = Some(model);
        self
    }

    pub fn with_email(mut self, email: String) -> Self {
        self.account_email = Some(email);
        self
    }

    pub fn with_org(mut self, org: String) -> Self {
        self.account_org = Some(org);
        self
    }

    pub fn with_plan(mut self, plan: String) -> Self {
        self.account_plan = Some(plan);
        self
    }

    /// Returns the most restrictive (highest used) window
    pub fn most_restrictive_percent(&self) -> f64 {
        let mut max = self.primary.used_percent;
        if let Some(ref s) = self.secondary {
            max = max.max(s.used_percent);
        }
        if let Some(ref m) = self.model_specific {
            max = max.max(m.used_percent);
        }
        max
    }
}

/// Cost/credits information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostSnapshot {
    /// Total cost in USD (last 30 days)
    pub total_cost_usd: Option<f64>,
    /// Credits remaining
    pub credits_remaining: Option<f64>,
    /// Credits total
    pub credits_total: Option<f64>,
}

/// Result of fetching usage for a provider
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderFetchResult {
    /// Provider ID
    pub provider_id: String,
    /// Provider display name
    pub provider_name: String,
    /// Usage data (None if fetch failed)
    pub usage: Option<UsageSnapshot>,
    /// Cost data
    pub cost: Option<CostSnapshot>,
    /// Error message if fetch failed
    pub error: Option<String>,
    /// Whether data is stale (older than 2x refresh interval)
    pub is_stale: bool,
}
