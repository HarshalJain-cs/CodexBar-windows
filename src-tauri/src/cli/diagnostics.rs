use codexbar_lib::core::provider::ProviderId;
use codexbar_lib::settings::Settings;
use codexbar_lib::status;

/// Run the `diagnostics` command
pub async fn run(json: bool, output: Option<String>) -> i32 {
    let settings = Settings::load();
    let http_client = reqwest::Client::new();

    // Collect provider statuses
    let mut provider_statuses = Vec::new();
    for id in ProviderId::all() {
        let st = status::fetch_statuspage(&http_client, *id).await;
        provider_statuses.push(serde_json::json!({
            "id": format!("{:?}", id).to_lowercase(),
            "name": id.display_name(),
            "enabled": settings.is_provider_enabled(id),
            "dashboardUrl": id.dashboard_url(),
            "statusPageUrl": id.status_page_url(),
            "status": st.map(|s| serde_json::json!({
                "level": s.level,
                "description": s.description,
            })),
        }));
    }

    // Redacted settings
    let mut redacted_settings = serde_json::to_value(&settings).unwrap_or_default();
    if let Some(obj) = redacted_settings.as_object_mut() {
        obj.insert("manualCookies".to_string(), serde_json::json!("<redacted>"));
        obj.insert("apiKeys".to_string(), serde_json::json!("<redacted>"));
    }

    // Check auth file existence
    let home = dirs::home_dir().unwrap_or_default();
    let auth_files = serde_json::json!({
        "claude_credentials": home.join(".claude/.credentials.json").exists(),
        "codex_auth": home.join(".codex/auth.json").exists(),
        "gemini_oauth": home.join(".gemini/oauth_creds.json").exists(),
    });

    // System info
    let diag = serde_json::json!({
        "app": {
            "name": "CodexBar for Windows",
            "version": env!("CARGO_PKG_VERSION"),
        },
        "system": {
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "family": std::env::consts::FAMILY,
        },
        "configPath": Settings::settings_path().to_string_lossy(),
        "settings": redacted_settings,
        "authFiles": auth_files,
        "providers": provider_statuses,
    });

    let content = if json {
        serde_json::to_string_pretty(&diag).unwrap_or_default()
    } else {
        format_human_readable(&diag)
    };

    match output {
        Some(path) => {
            match std::fs::write(&path, &content) {
                Ok(()) => {
                    println!("Diagnostics saved to: {}", path);
                    0
                }
                Err(e) => {
                    eprintln!("Failed to write diagnostics: {}", e);
                    1
                }
            }
        }
        None => {
            println!("{}", content);
            0
        }
    }
}

fn format_human_readable(diag: &serde_json::Value) -> String {
    let mut lines = Vec::new();

    lines.push("=== CodexBar Diagnostics ===".to_string());
    lines.push(String::new());

    // App info
    if let Some(app) = diag.get("app") {
        lines.push(format!(
            "App: {} v{}",
            app.get("name").and_then(|v| v.as_str()).unwrap_or("?"),
            app.get("version").and_then(|v| v.as_str()).unwrap_or("?"),
        ));
    }

    // System info
    if let Some(sys) = diag.get("system") {
        lines.push(format!(
            "System: {} / {}",
            sys.get("os").and_then(|v| v.as_str()).unwrap_or("?"),
            sys.get("arch").and_then(|v| v.as_str()).unwrap_or("?"),
        ));
    }

    // Config path
    if let Some(path) = diag.get("configPath").and_then(|v| v.as_str()) {
        lines.push(format!("Config: {}", path));
    }

    lines.push(String::new());
    lines.push("--- Auth Files ---".to_string());

    if let Some(auth) = diag.get("authFiles").and_then(|v| v.as_object()) {
        for (key, val) in auth {
            let found = val.as_bool().unwrap_or(false);
            let indicator = if found { "\u{2713}" } else { "\u{2717}" };
            lines.push(format!("  {} {}", indicator, key));
        }
    }

    lines.push(String::new());
    lines.push("--- Providers ---".to_string());

    if let Some(providers) = diag.get("providers").and_then(|v| v.as_array()) {
        for p in providers {
            let name = p.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let enabled = p.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
            let status_desc = p
                .get("status")
                .and_then(|s| s.get("description"))
                .and_then(|v| v.as_str())
                .unwrap_or("No status page");

            let enabled_str = if enabled { "enabled" } else { "disabled" };
            lines.push(format!("  {:<10} [{}] {}", name, enabled_str, status_desc));
        }
    }

    lines.push(String::new());
    lines.push("--- Settings (redacted) ---".to_string());

    if let Some(settings) = diag.get("settings").and_then(|v| v.as_object()) {
        for (key, val) in settings {
            if key == "manualCookies" || key == "apiKeys" {
                lines.push(format!("  {}: <redacted>", key));
            } else {
                lines.push(format!("  {}: {}", key, val));
            }
        }
    }

    lines.join("\n")
}
