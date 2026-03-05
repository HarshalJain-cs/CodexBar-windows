use codexbar_lib::core::credentials::CredentialStore;
use codexbar_lib::core::provider::ProviderId;

/// Show account status for providers
pub async fn status(provider_filter: Option<String>) -> i32 {
    let providers: Vec<ProviderId> = if let Some(ref name) = provider_filter {
        match ProviderId::from_str_id(name) {
            Some(id) => vec![id],
            None => {
                eprintln!("Unknown provider: {}", name);
                return 1;
            }
        }
    } else {
        ProviderId::all().to_vec()
    };

    let store = CredentialStore::new();

    for id in &providers {
        let name = id.display_name();
        let status = match id {
            ProviderId::Claude => {
                let creds_path = dirs::home_dir()
                    .unwrap_or_default()
                    .join(".claude")
                    .join(".credentials.json");
                if creds_path.exists() {
                    "Authenticated (OAuth credentials found)"
                } else {
                    "Not authenticated"
                }
            }
            ProviderId::Codex => {
                let auth_path = std::env::var("CODEX_HOME")
                    .map(|h| std::path::PathBuf::from(h).join("auth.json"))
                    .unwrap_or_else(|_| {
                        dirs::home_dir()
                            .unwrap_or_default()
                            .join(".codex")
                            .join("auth.json")
                    });
                if auth_path.exists() {
                    "Authenticated (auth.json found)"
                } else {
                    "Not authenticated"
                }
            }
            ProviderId::Copilot => match store.get("copilot_token") {
                Ok(Some(_)) => "Authenticated (token stored)",
                _ => "Not authenticated",
            },
            ProviderId::Gemini => {
                let creds_path = dirs::home_dir()
                    .unwrap_or_default()
                    .join(".gemini")
                    .join("oauth_creds.json");
                if creds_path.exists() {
                    "Authenticated (OAuth credentials found)"
                } else {
                    "Not authenticated"
                }
            }
            ProviderId::Cursor => "Cookie-based (auto-extracted from browser)",
        };

        println!("  {:<10} {}", name, status);
    }

    0
}

/// Login to a provider
pub async fn login(provider_name: &str) -> i32 {
    let id = match ProviderId::from_str_id(provider_name) {
        Some(id) => id,
        None => {
            eprintln!("Unknown provider: {}", provider_name);
            return 1;
        }
    };

    match id {
        ProviderId::Copilot => copilot_login().await,
        ProviderId::Claude => {
            println!("Claude uses OAuth via the Claude CLI.");
            println!("Run: claude login");
            0
        }
        ProviderId::Codex => {
            println!("Codex uses OAuth via the Codex CLI.");
            println!("Run: codex login");
            0
        }
        ProviderId::Gemini => {
            println!("Gemini uses OAuth via gcloud.");
            println!("Run: gemini auth login");
            0
        }
        ProviderId::Cursor => {
            println!("Cursor uses browser cookies (auto-extracted).");
            println!("Just sign in to cursor.com in your browser.");
            0
        }
    }
}

/// Logout from a provider
pub fn logout(provider_name: &str) -> i32 {
    let id = match ProviderId::from_str_id(provider_name) {
        Some(id) => id,
        None => {
            eprintln!("Unknown provider: {}", provider_name);
            return 1;
        }
    };

    match id {
        ProviderId::Copilot => {
            let store = CredentialStore::new();
            match store.delete("copilot_token") {
                Ok(()) => {
                    println!("Copilot token removed.");
                    0
                }
                Err(e) => {
                    eprintln!("Failed to remove token: {}", e);
                    1
                }
            }
        }
        _ => {
            println!(
                "{} credentials are managed by its CLI tool.",
                id.display_name()
            );
            0
        }
    }
}

/// Interactive Copilot login via device flow
async fn copilot_login() -> i32 {
    use codexbar_lib::providers::copilot::device_flow;

    println!("Starting GitHub device flow for Copilot...");

    let device_resp = match device_flow::start_device_flow().await {
        Ok(resp) => resp,
        Err(e) => {
            eprintln!("Failed to start device flow: {}", e);
            return 2;
        }
    };

    println!();
    println!("  Enter this code on GitHub: {}", device_resp.user_code);
    println!("  URL: {}", device_resp.verification_uri);
    println!();

    // Try to open the URL
    let _ = open::that(&device_resp.verification_uri);

    println!("Waiting for authorization (press Ctrl+C to cancel)...");

    let interval = std::time::Duration::from_secs(device_resp.interval.max(5));
    let deadline =
        std::time::Instant::now() + std::time::Duration::from_secs(device_resp.expires_in);

    loop {
        if std::time::Instant::now() > deadline {
            eprintln!("Device code expired. Please try again.");
            return 2;
        }

        tokio::time::sleep(interval).await;

        match device_flow::poll_for_token(&device_resp.device_code).await {
            Ok(Some(_token)) => {
                println!("Successfully authenticated with GitHub Copilot!");
                return 0;
            }
            Ok(None) => {
                // Still waiting
                continue;
            }
            Err(e) => {
                eprintln!("Error: {}", e);
                return 2;
            }
        }
    }
}
