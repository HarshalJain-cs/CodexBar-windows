use tauri::Emitter;

use crate::core::provider::{FetchContext, ProviderId};
use crate::core::usage_snapshot::ProviderFetchResult;
use crate::state::AppState;
use crate::status;

/// Perform a full refresh of all enabled providers
pub async fn refresh_all_providers(app_state: &AppState, app_handle: &tauri::AppHandle) {
    let settings = app_state.settings.read().await.clone();
    let http_client = reqwest::Client::new();

    for id in ProviderId::all() {
        if !settings.is_provider_enabled(id) {
            continue;
        }

        refresh_single_provider(app_state, *id, &settings).await;
    }

    // Fetch status pages
    for id in ProviderId::all() {
        if !settings.is_provider_enabled(id) {
            continue;
        }
        if let Some(status) = status::fetch_statuspage(&http_client, *id).await {
            let mut statuses = app_state.statuses.write().await;
            statuses.insert(*id, status);
        }
    }

    // Emit event so the frontend updates
    let _ = app_handle.emit("usage-updated", ());
}

/// Refresh a single provider and update the cache
pub async fn refresh_single_provider(
    app_state: &AppState,
    id: ProviderId,
    settings: &crate::settings::Settings,
) -> ProviderFetchResult {
    let ctx = FetchContext {
        source_mode: settings.get_source_mode(&id),
        manual_cookie: settings.get_manual_cookie(&id).cloned(),
        api_key: settings.get_api_key(&id).cloned(),
    };

    let provider = crate::providers::create_provider(id);
    let result = match provider.fetch_usage(&ctx).await {
        Ok(usage) => ProviderFetchResult {
            provider_id: format!("{:?}", id).to_lowercase(),
            provider_name: id.display_name().to_string(),
            usage: Some(usage),
            cost: None,
            error: None,
            is_stale: false,
        },
        Err(e) => {
            tracing::warn!("Failed to fetch {}: {}", id.display_name(), e);
            ProviderFetchResult {
                provider_id: format!("{:?}", id).to_lowercase(),
                provider_name: id.display_name().to_string(),
                usage: None,
                cost: None,
                error: Some(e.to_string()),
                is_stale: true,
            }
        }
    };

    let mut snapshots = app_state.snapshots.write().await;
    snapshots.insert(id, result.clone());

    result
}
