use tauri::{AppHandle, Emitter, State};

use crate::core::provider::ProviderId;
use crate::core::usage_snapshot::ProviderFetchResult;
use crate::refresh;
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

/// Refresh a specific provider (triggers a fresh fetch)
#[tauri::command]
pub async fn refresh_provider(
    app: AppHandle,
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<ProviderFetchResult, String> {
    let id = ProviderId::from_str_id(&provider_id)
        .ok_or_else(|| format!("Unknown provider: {}", provider_id))?;

    let settings = state.settings.read().await.clone();
    let result = refresh::refresh_single_provider(&state, id, &settings).await;

    // Emit event so the frontend updates
    let _ = app.emit("usage-updated", ());

    Ok(result)
}

/// Refresh all enabled providers (triggers fresh fetches)
#[tauri::command]
pub async fn refresh_all(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<ProviderFetchResult>, String> {
    refresh::refresh_all_providers(&state, &app).await;

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
            let provider = crate::providers::create_provider(*id);
            let meta = provider.metadata();
            serde_json::json!({
                "id": format!("{:?}", id).to_lowercase(),
                "name": id.display_name(),
                "dashboardUrl": id.dashboard_url(),
                "hasStatusPage": id.status_page_url().is_some(),
                "supportsOauth": meta.supports_oauth,
                "supportsCookies": meta.supports_cookies,
                "supportsCli": meta.supports_cli,
                "supportsApiKey": meta.supports_api_key,
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

/// Get usage trends for all providers
#[tauri::command]
pub async fn get_usage_trends(
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let history = state.history.read().await;
    let mut trends = Vec::new();

    for id in ProviderId::all() {
        let trend = history.trend(id);
        let points = history.get(id);
        if !points.is_empty() {
            trends.push(serde_json::json!({
                "providerId": format!("{:?}", id).to_lowercase(),
                "trend": trend,
                "points": points,
            }));
        }
    }

    Ok(trends)
}

/// Shared diagnostics export logic (usable from both Tauri command and tray menu)
pub async fn export_diagnostics_impl(app_state: &AppState) -> Result<String, String> {
    let settings = app_state.settings.read().await;
    let snapshots = app_state.snapshots.read().await;
    let statuses = app_state.statuses.read().await;

    // Redacted settings (strip cookies and API keys)
    let mut redacted_settings = serde_json::to_value(&*settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    if let Some(obj) = redacted_settings.as_object_mut() {
        obj.insert("manualCookies".to_string(), serde_json::json!("<redacted>"));
        obj.insert("apiKeys".to_string(), serde_json::json!("<redacted>"));
    }

    let diag = serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "settings": redacted_settings,
        "providers": snapshots.iter().map(|(id, result)| {
            serde_json::json!({
                "id": format!("{:?}", id).to_lowercase(),
                "name": id.display_name(),
                "hasUsage": result.usage.is_some(),
                "hasError": result.error.is_some(),
                "error": result.error,
                "isStale": result.is_stale,
            })
        }).collect::<Vec<_>>(),
        "statuses": statuses.values().cloned().collect::<Vec<_>>(),
    });

    serde_json::to_string_pretty(&diag)
        .map_err(|e| format!("Failed to serialize diagnostics: {}", e))
}

/// Export diagnostics bundle as JSON (Tauri command wrapper)
#[tauri::command]
pub async fn export_diagnostics(state: State<'_, AppState>) -> Result<String, String> {
    export_diagnostics_impl(state.inner()).await
}
