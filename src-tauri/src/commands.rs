use tauri::State;

use crate::core::provider::ProviderId;
use crate::core::usage_snapshot::ProviderFetchResult;
use crate::settings::Settings;
use crate::state::AppState;
use crate::status::ProviderStatus;

/// Get usage data for all enabled providers
#[tauri::command]
pub async fn get_all_usage(
    state: State<'_, AppState>,
) -> Result<Vec<ProviderFetchResult>, String> {
    let snapshots = state.snapshots.read().await;
    Ok(snapshots.values().cloned().collect())
}

/// Refresh a specific provider
#[tauri::command]
pub async fn refresh_provider(
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<ProviderFetchResult, String> {
    let id = ProviderId::from_str_id(&provider_id)
        .ok_or_else(|| format!("Unknown provider: {}", provider_id))?;

    // For now, return whatever is cached or an empty result
    let snapshots = state.snapshots.read().await;
    match snapshots.get(&id) {
        Some(result) => Ok(result.clone()),
        None => Ok(ProviderFetchResult {
            provider_id: format!("{:?}", id).to_lowercase(),
            provider_name: id.display_name().to_string(),
            usage: None,
            cost: None,
            error: Some("Not yet fetched".to_string()),
            is_stale: true,
        }),
    }
}

/// Refresh all enabled providers
#[tauri::command]
pub async fn refresh_all(state: State<'_, AppState>) -> Result<Vec<ProviderFetchResult>, String> {
    // TODO: Trigger actual provider fetches
    let snapshots = state.snapshots.read().await;
    Ok(snapshots.values().cloned().collect())
}

/// Get current settings
#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    let settings = state.settings.read().await;
    Ok(settings.clone())
}

/// Update settings
#[tauri::command]
pub async fn update_settings(
    state: State<'_, AppState>,
    settings: Settings,
) -> Result<(), String> {
    settings.save()?;
    let mut current = state.settings.write().await;
    *current = settings;
    Ok(())
}

/// Get provider status information
#[tauri::command]
pub async fn get_provider_status(
    state: State<'_, AppState>,
) -> Result<Vec<ProviderStatus>, String> {
    let statuses = state.statuses.read().await;
    Ok(statuses.values().cloned().collect())
}

/// Get list of all available providers with metadata
#[tauri::command]
pub async fn get_available_providers() -> Result<Vec<serde_json::Value>, String> {
    let providers: Vec<serde_json::Value> = ProviderId::all()
        .iter()
        .map(|id| {
            serde_json::json!({
                "id": format!("{:?}", id).to_lowercase(),
                "name": id.display_name(),
                "dashboardUrl": id.dashboard_url(),
                "hasStatusPage": id.status_page_url().is_some(),
            })
        })
        .collect();
    Ok(providers)
}

/// Open a URL in the default browser
#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}
