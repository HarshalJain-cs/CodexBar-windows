pub mod browser;
mod commands;
pub mod core;
mod notifications;
pub mod providers;
pub mod refresh;
pub mod settings;
mod single_instance;
pub mod sound;
pub mod state;
pub mod status;
mod tray;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WindowEvent,
};

use crate::notifications::NotificationTracker;
use crate::state::AppState;
use crate::tray::renderer;

/// Greet command (placeholder for testing)
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Welcome to {}! Configure your providers in Settings.", name)
}

/// Start the Copilot GitHub device flow
#[tauri::command]
async fn start_copilot_device_flow(
) -> Result<providers::copilot::device_flow::DeviceCodeResponse, String> {
    providers::copilot::device_flow::start_device_flow()
        .await
        .map_err(|e| e.to_string())
}

/// Poll for Copilot device flow token
#[tauri::command]
async fn poll_copilot_device_flow(device_code: String) -> Result<Option<String>, String> {
    providers::copilot::device_flow::poll_for_token(&device_code)
        .await
        .map_err(|e| e.to_string())
}

/// Check for updates using tauri-plugin-updater
#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_updater::UpdaterExt;
    match app.updater().map_err(|e| e.to_string())?.check().await {
        Ok(Some(update)) => Ok(Some(format!(
            "v{} available",
            update.version
        ))),
        Ok(None) => Ok(None),
        Err(e) => {
            tracing::warn!("Update check failed: {}", e);
            Err(e.to_string())
        }
    }
}

/// Toggle autostart on/off
#[tauri::command]
async fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| e.to_string())?;
    } else {
        autostart.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Get autostart status
#[tauri::command]
async fn get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .is_enabled()
        .map_err(|e| e.to_string())
}

/// Perform a full refresh of all enabled providers (delegates to shared module)
async fn refresh_all_providers(app_state: &AppState, app_handle: &tauri::AppHandle) {
    refresh::refresh_all_providers(app_state, app_handle).await;
}

/// Register global shortcut to toggle the window
fn register_global_shortcut(app: &tauri::AppHandle, shortcut_str: &str) {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    // Unregister all first
    let _ = app.global_shortcut().unregister_all();

    if let Err(e) = app.global_shortcut().on_shortcut(shortcut_str, move |_app, _shortcut, event| {
        if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
            if let Some(window) = _app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
    }) {
        tracing::warn!("Failed to register shortcut '{}': {}", shortcut_str, e);
    } else {
        tracing::info!("Registered global shortcut: {}", shortcut_str);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Single instance guard - prevent multiple instances
    let _instance_guard = match single_instance::SingleInstanceGuard::acquire() {
        Ok(guard) => guard,
        Err(msg) => {
            eprintln!("{}", msg);
            std::process::exit(1);
        }
    };

    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let app_state = AppState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::get_all_usage,
            commands::refresh_provider,
            commands::refresh_all,
            commands::get_settings,
            commands::update_settings,
            commands::get_provider_status,
            commands::get_available_providers,
            commands::open_url,
            commands::export_diagnostics,
            start_copilot_device_flow,
            poll_copilot_device_flow,
            check_for_updates,
            set_autostart,
            get_autostart,
        ])
        .setup(|app| {
            // Build tray menu
            let quit = MenuItem::with_id(app, "quit", "Quit CodexBar", true, None::<&str>)?;
            let refresh =
                MenuItem::with_id(app, "refresh", "Refresh All", true, None::<&str>)?;
            let settings_item =
                MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
            let separator =
                MenuItem::with_id(app, "sep", "─────────────", false, None::<&str>)?;

            let menu =
                Menu::with_items(app, &[&refresh, &separator, &settings_item, &quit])?;

            // Generate initial tray icon
            let initial_icon = renderer::create_bar_icon(0.0, 0.0);
            let icon = Image::new_owned(initial_icon, 32, 32);

            // Build tray icon
            let _tray = TrayIconBuilder::with_id("main")
                .icon(icon)
                .menu(&menu)
                .tooltip("CodexBar - AI Usage Monitor")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "refresh" => {
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let state = app.state::<AppState>();
                            refresh_all_providers(state.inner(), &app).await;
                        });
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                // Position window near the tray icon
                                if let Ok(Some(rect)) = tray.rect() {
                                    let tray_x = match rect.position {
                                        tauri::Position::Physical(p) => p.x,
                                        tauri::Position::Logical(p) => p.x as i32,
                                    };
                                    let tray_y = match rect.position {
                                        tauri::Position::Physical(p) => p.y,
                                        tauri::Position::Logical(p) => p.y as i32,
                                    };
                                    let x = (tray_x - 200).max(0);
                                    let y = (tray_y - 630).max(0);
                                    let _ = window.set_position(tauri::Position::Physical(
                                        tauri::PhysicalPosition::new(x, y),
                                    ));
                                }
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Hide window when it loses focus
            let main_window = app.get_webview_window("main").unwrap();
            let window_clone = main_window.clone();
            main_window.on_window_event(move |event| {
                if let WindowEvent::Focused(false) = event {
                    let _ = window_clone.hide();
                }
            });

            // Register global shortcut from settings
            let settings = settings::Settings::load();
            let shortcut = settings.global_shortcut.clone();
            register_global_shortcut(app.handle(), &shortcut);

            // Sync autostart setting
            {
                let app_handle = app.handle().clone();
                let start_at_login = settings.start_at_login;
                tauri::async_runtime::spawn(async move {
                    use tauri_plugin_autostart::ManagerExt;
                    let autostart = app_handle.autolaunch();
                    let is_enabled = autostart.is_enabled().unwrap_or(false);
                    if start_at_login && !is_enabled {
                        let _ = autostart.enable();
                    } else if !start_at_login && is_enabled {
                        let _ = autostart.disable();
                    }
                });
            }

            // Start background refresh timer with notifications
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Initial fetch after a short delay
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;

                let mut notification_tracker = NotificationTracker::new();

                loop {
                    let state = app_handle.state::<AppState>();
                    refresh_all_providers(state.inner(), &app_handle).await;

                    // Check thresholds and send notifications
                    notification_tracker
                        .check_and_notify(&app_handle, state.inner())
                        .await;

                    // Update tray icon
                    let mut tray_mgr = tray::manager::TrayManager::new();
                    if let Some(icon_bytes) = tray_mgr.generate_icon(state.inner()).await {
                        let icon = Image::new_owned(icon_bytes, 32, 32);
                        if let Some(tray) = app_handle.tray_by_id("main") {
                            let _ = tray.set_icon(Some(icon));
                        }
                    }

                    // Update tooltip
                    let tooltip = tray_mgr.generate_tooltip(state.inner()).await;
                    if let Some(tray) = app_handle.tray_by_id("main") {
                        let _ = tray.set_tooltip(Some(&tooltip));
                    }

                    // Wait for next refresh cycle
                    let interval = {
                        let settings = state.settings.read().await;
                        settings.refresh_interval_secs
                    };
                    tokio::time::sleep(std::time::Duration::from_secs(interval)).await;
                }
            });

            // Check for updates on startup (non-blocking)
            let update_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Wait a bit before checking updates
                tokio::time::sleep(std::time::Duration::from_secs(10)).await;
                use tauri_plugin_updater::UpdaterExt;
                match update_handle.updater() {
                    Ok(updater) => {
                        match updater.check().await {
                            Ok(Some(update)) => {
                                tracing::info!("Update available: v{}", update.version);
                                let _ = update_handle.emit("update-available", &update.version);
                            }
                            Ok(None) => {
                                tracing::info!("App is up to date");
                            }
                            Err(e) => {
                                tracing::debug!("Update check failed: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        tracing::debug!("Updater not configured: {}", e);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
