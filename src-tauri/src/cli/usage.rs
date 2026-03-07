use codexbar_lib::core::provider::{FetchContext, ProviderId};
use codexbar_lib::core::rate_window::UsageLevel;
use codexbar_lib::providers;
use codexbar_lib::settings::Settings;
use codexbar_lib::status;

/// Run the `usage` command
pub async fn run(provider_filter: Option<String>, json: bool, all: bool, show_status: bool) -> i32 {
    let settings = Settings::load();

    let target_providers: Vec<ProviderId> = if let Some(ref name) = provider_filter {
        match ProviderId::from_str_id(name) {
            Some(id) => vec![id],
            None => {
                eprintln!("Unknown provider: {}. Valid: codex, claude, cursor, gemini, copilot", name);
                return 1;
            }
        }
    } else if all {
        ProviderId::all().to_vec()
    } else {
        ProviderId::all()
            .iter()
            .filter(|id| settings.is_provider_enabled(id))
            .copied()
            .collect()
    };

    if target_providers.is_empty() {
        if json {
            println!("[]");
        } else {
            eprintln!("No providers enabled. Use `codexbar config set enabled_providers claude,codex`");
        }
        return 0;
    }

    let mut results = Vec::new();
    let http_client = reqwest::Client::new();

    for id in &target_providers {
        let ctx = FetchContext {
            source_mode: settings.get_source_mode(id),
            manual_cookie: settings.get_manual_cookie(id).cloned(),
            api_key: settings.get_api_key(id).cloned(),
        };

        let provider = providers::create_provider(*id);
        let status_info = if show_status {
            status::fetch_statuspage(&http_client, *id).await
        } else {
            None
        };

        match provider.fetch_usage(&ctx).await {
            Ok(usage) => {
                if json {
                    let mut entry = serde_json::json!({
                        "provider": format!("{:?}", id).to_lowercase(),
                        "name": id.display_name(),
                        "usage": usage,
                        "error": null,
                    });
                    if let Some(ref st) = status_info {
                        entry["status"] = serde_json::json!({
                            "level": st.level,
                            "description": st.description,
                        });
                    }
                    results.push(entry);
                } else {
                    print_usage_card(id, &usage);
                    if let Some(ref st) = status_info {
                        print_status(st);
                    }
                }
            }
            Err(e) => {
                if json {
                    let mut entry = serde_json::json!({
                        "provider": format!("{:?}", id).to_lowercase(),
                        "name": id.display_name(),
                        "usage": null,
                        "error": e.to_string(),
                    });
                    if let Some(ref st) = status_info {
                        entry["status"] = serde_json::json!({
                            "level": st.level,
                            "description": st.description,
                        });
                    }
                    results.push(entry);
                } else {
                    eprintln!("{}: {}", id.display_name(), color_red(&e.to_string()));
                    if let Some(ref st) = status_info {
                        print_status(st);
                    }
                }
            }
        }
    }

    if json {
        println!("{}", serde_json::to_string_pretty(&results).unwrap_or_default());
    }

    0
}

fn print_usage_card(id: &ProviderId, usage: &codexbar_lib::core::usage_snapshot::UsageSnapshot) {
    let name = id.display_name();
    let source = &usage.source_label;
    let plan = usage.account_plan.as_deref().unwrap_or("");

    println!();
    println!(
        "  {} {} {}",
        color_bold(name),
        if plan.is_empty() {
            String::new()
        } else {
            format!("({})", plan)
        },
        color_dim(&format!("[{}]", source))
    );

    // Session bar
    print_bar("Session", &usage.primary);

    // Weekly bar
    if let Some(ref weekly) = usage.secondary {
        print_bar("Weekly ", weekly);
    }

    // Model-specific bar
    if let Some(ref model) = usage.model_specific {
        print_bar("Model  ", model);
    }

    // Account info
    if let Some(ref email) = usage.account_email {
        println!("  {}", color_dim(email));
    }
}

fn print_bar(label: &str, window: &codexbar_lib::core::rate_window::RateWindow) {
    let pct = window.used_percent;
    let remaining = window.remaining_percent();
    let bar_width = 30;
    let filled = ((pct / 100.0) * bar_width as f64).round() as usize;
    let empty = bar_width - filled;

    let level = window.usage_level();
    let color_fn = match level {
        UsageLevel::Low => color_green,
        UsageLevel::Medium => color_yellow,
        UsageLevel::High => color_orange,
        UsageLevel::Critical => color_red,
    };

    let bar = format!(
        "{}{}",
        color_fn(&"█".repeat(filled)),
        color_dim(&"░".repeat(empty))
    );

    let countdown = window.format_countdown();
    let desc = window
        .reset_description
        .as_deref()
        .unwrap_or(&countdown);

    // Pacing arrow (from ClaudexBar concept)
    let pace_str = match window.pacing() {
        Some((_, arrow)) => format!(" {}", arrow),
        None => String::new(),
    };

    println!(
        "  {} [{}] {:>5.1}% left{}  {}",
        label,
        bar,
        remaining,
        pace_str,
        color_dim(desc)
    );
}

// ANSI color helpers
fn color_bold(s: &str) -> String {
    format!("\x1b[1m{}\x1b[0m", s)
}

fn color_dim(s: &str) -> String {
    format!("\x1b[2m{}\x1b[0m", s)
}

fn color_green(s: &str) -> String {
    format!("\x1b[32m{}\x1b[0m", s)
}

fn color_yellow(s: &str) -> String {
    format!("\x1b[33m{}\x1b[0m", s)
}

fn color_orange(s: &str) -> String {
    format!("\x1b[38;5;208m{}\x1b[0m", s)
}

fn color_red(s: &str) -> String {
    format!("\x1b[31m{}\x1b[0m", s)
}

fn print_status(st: &codexbar_lib::status::ProviderStatus) {
    use codexbar_lib::status::StatusLevel;
    let (indicator, color_fn): (&str, fn(&str) -> String) = match st.level {
        StatusLevel::Operational => ("\u{2713}", color_green),
        StatusLevel::DegradedPerformance => ("~", color_yellow),
        StatusLevel::PartialOutage => ("!", color_orange),
        StatusLevel::MajorOutage => ("\u{2717}", color_red),
        StatusLevel::Unknown => ("?", color_dim),
    };
    println!("  {} Status: {}", color_fn(indicator), st.description);
}
