use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::core::provider::ProviderId;
use crate::core::usage_snapshot::ProviderFetchResult;
use crate::settings::Settings;
use crate::status::ProviderStatus;

/// Shared application state accessible from Tauri commands
pub struct AppState {
    pub settings: Arc<RwLock<Settings>>,
    pub snapshots: Arc<RwLock<HashMap<ProviderId, ProviderFetchResult>>>,
    pub statuses: Arc<RwLock<HashMap<ProviderId, ProviderStatus>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            settings: Arc::new(RwLock::new(Settings::load())),
            snapshots: Arc::new(RwLock::new(HashMap::new())),
            statuses: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}
