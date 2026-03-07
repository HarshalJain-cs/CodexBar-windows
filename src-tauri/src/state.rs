use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::core::provider::ProviderId;
use crate::core::usage_snapshot::ProviderFetchResult;
use crate::settings::Settings;
use crate::status::ProviderStatus;

/// A single usage history data point
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageHistoryPoint {
    pub timestamp: String,
    pub used_percent: f64,
}

/// Ring buffer of recent usage data points per provider
pub struct UsageHistory {
    entries: HashMap<ProviderId, VecDeque<UsageHistoryPoint>>,
    max_entries: usize,
}

impl UsageHistory {
    pub fn new(max_entries: usize) -> Self {
        Self {
            entries: HashMap::new(),
            max_entries,
        }
    }

    /// Record a new usage data point
    pub fn record(&mut self, id: ProviderId, used_percent: f64) {
        let points = self.entries.entry(id).or_insert_with(VecDeque::new);
        points.push_back(UsageHistoryPoint {
            timestamp: chrono::Utc::now().to_rfc3339(),
            used_percent,
        });
        while points.len() > self.max_entries {
            points.pop_front();
        }
    }

    /// Get the trend direction for a provider: "rising", "falling", "steady", or None
    pub fn trend(&self, id: &ProviderId) -> Option<String> {
        let points = self.entries.get(id)?;
        if points.len() < 2 {
            return None;
        }
        let recent = points.back()?.used_percent;
        let prev = points.get(points.len().saturating_sub(3))?.used_percent;
        let diff = recent - prev;
        if diff > 2.0 {
            Some("rising".to_string())
        } else if diff < -2.0 {
            Some("falling".to_string())
        } else {
            Some("steady".to_string())
        }
    }

    /// Get history points for a provider
    pub fn get(&self, id: &ProviderId) -> Vec<UsageHistoryPoint> {
        self.entries
            .get(id)
            .map(|d| d.iter().cloned().collect())
            .unwrap_or_default()
    }
}

/// Shared application state accessible from Tauri commands
pub struct AppState {
    pub settings: Arc<RwLock<Settings>>,
    pub snapshots: Arc<RwLock<HashMap<ProviderId, ProviderFetchResult>>>,
    pub statuses: Arc<RwLock<HashMap<ProviderId, ProviderStatus>>>,
    pub history: Arc<RwLock<UsageHistory>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            settings: Arc::new(RwLock::new(Settings::load())),
            snapshots: Arc::new(RwLock::new(HashMap::new())),
            statuses: Arc::new(RwLock::new(HashMap::new())),
            history: Arc::new(RwLock::new(UsageHistory::new(20))),
        }
    }
}
