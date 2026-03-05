use codexbar_lib::settings::Settings;

/// List all settings
pub fn list() -> i32 {
    let settings = Settings::load();
    match serde_json::to_string_pretty(&settings) {
        Ok(json) => {
            println!("{}", json);
            0
        }
        Err(e) => {
            eprintln!("Failed to serialize settings: {}", e);
            1
        }
    }
}

/// Get a specific setting
pub fn get(key: &str) -> i32 {
    let settings = Settings::load();
    let json = match serde_json::to_value(&settings) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Failed to serialize: {}", e);
            return 1;
        }
    };

    // Try camelCase key first, then snake_case
    let value = json.get(key).or_else(|| {
        let camel = to_camel_case(key);
        json.get(&camel)
    });

    match value {
        Some(v) => {
            println!("{}", serde_json::to_string_pretty(v).unwrap_or_default());
            0
        }
        None => {
            eprintln!("Unknown setting: {}", key);
            eprintln!("Available keys:");
            if let serde_json::Value::Object(map) = &json {
                for k in map.keys() {
                    eprintln!("  {}", k);
                }
            }
            1
        }
    }
}

/// Set a specific setting
pub fn set(key: &str, value: &str) -> i32 {
    let settings = Settings::load();
    let mut json = match serde_json::to_value(&settings) {
        Ok(serde_json::Value::Object(map)) => map,
        _ => {
            eprintln!("Failed to serialize settings");
            return 1;
        }
    };

    // Try to parse value as JSON, fallback to string
    let parsed_value: serde_json::Value = serde_json::from_str(value)
        .unwrap_or_else(|_| serde_json::Value::String(value.to_string()));

    // Try camelCase key
    let actual_key = if json.contains_key(key) {
        key.to_string()
    } else {
        let camel = to_camel_case(key);
        if json.contains_key(&camel) {
            camel
        } else {
            eprintln!("Unknown setting: {}", key);
            return 1;
        }
    };

    json.insert(actual_key.clone(), parsed_value);

    // Deserialize back to Settings
    match serde_json::from_value::<Settings>(serde_json::Value::Object(json)) {
        Ok(new_settings) => {
            if let Err(e) = new_settings.save() {
                eprintln!("Failed to save: {}", e);
                return 1;
            }
            println!("Set {} successfully", actual_key);
            0
        }
        Err(e) => {
            eprintln!("Invalid value: {}", e);
            1
        }
    }
}

/// Show config file path
pub fn path() -> i32 {
    println!("{}", Settings::settings_path().display());
    0
}

/// Set autostart
pub fn autostart_set(enable: bool) -> i32 {
    let mut settings = Settings::load();
    settings.start_at_login = enable;
    if let Err(e) = settings.save() {
        eprintln!("Failed to save: {}", e);
        return 1;
    }
    println!(
        "Autostart {}",
        if enable { "enabled" } else { "disabled" }
    );
    // Note: actual registry entry is managed by the GUI app via tauri-plugin-autostart
    if enable {
        println!("  (Takes effect when the CodexBar GUI app is next launched)");
    }
    0
}

/// Show autostart status
pub fn autostart_status() -> i32 {
    let settings = Settings::load();
    println!(
        "Autostart: {}",
        if settings.start_at_login {
            "enabled"
        } else {
            "disabled"
        }
    );
    0
}

/// Validate config files
pub fn validate() -> i32 {
    let path = Settings::settings_path();
    let mut ok = true;

    println!("Validating config files...\n");

    if path.exists() {
        match std::fs::read_to_string(&path) {
            Ok(content) => match serde_json::from_str::<Settings>(&content) {
                Ok(_) => println!("  \u{2713} settings.json: valid"),
                Err(e) => {
                    eprintln!("  \u{2717} settings.json: INVALID - {}", e);
                    ok = false;
                }
            },
            Err(e) => {
                eprintln!("  \u{2717} settings.json: cannot read - {}", e);
                ok = false;
            }
        }
    } else {
        println!("  - settings.json: not found (will use defaults)");
    }

    let home = dirs::home_dir().unwrap_or_default();

    let claude_creds = home.join(".claude").join(".credentials.json");
    if claude_creds.exists() {
        match std::fs::read_to_string(&claude_creds) {
            Ok(content) => match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(_) => println!("  \u{2713} Claude credentials: valid JSON"),
                Err(e) => {
                    eprintln!("  \u{2717} Claude credentials: INVALID - {}", e);
                    ok = false;
                }
            },
            Err(_) => println!("  - Claude credentials: cannot read"),
        }
    } else {
        println!("  - Claude credentials: not found");
    }

    let codex_auth = home.join(".codex").join("auth.json");
    if codex_auth.exists() {
        match std::fs::read_to_string(&codex_auth) {
            Ok(content) => match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(_) => println!("  \u{2713} Codex auth: valid JSON"),
                Err(e) => {
                    eprintln!("  \u{2717} Codex auth: INVALID - {}", e);
                    ok = false;
                }
            },
            Err(_) => println!("  - Codex auth: cannot read"),
        }
    } else {
        println!("  - Codex auth: not found");
    }

    if ok {
        println!("\nAll config files are valid.");
        0
    } else {
        eprintln!("\nSome config files have issues.");
        1
    }
}

fn to_camel_case(s: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = false;
    for ch in s.chars() {
        if ch == '_' {
            capitalize_next = true;
        } else if capitalize_next {
            result.push(ch.to_ascii_uppercase());
            capitalize_next = false;
        } else {
            result.push(ch);
        }
    }
    result
}
