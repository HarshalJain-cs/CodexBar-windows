use codexbar_lib::core::provider::{FetchContext, ProviderId};
use codexbar_lib::providers;
use codexbar_lib::settings::Settings;

/// Run the `cost` command
pub async fn run(provider_filter: Option<String>, json: bool) -> i32 {
    let settings = Settings::load();

    let target_providers: Vec<ProviderId> = if let Some(ref name) = provider_filter {
        match ProviderId::from_str_id(name) {
            Some(id) => vec![id],
            None => {
                eprintln!("Unknown provider: {}", name);
                return 1;
            }
        }
    } else {
        ProviderId::all()
            .iter()
            .filter(|id| settings.is_provider_enabled(id))
            .copied()
            .collect()
    };

    let mut results = Vec::new();

    for id in &target_providers {
        let ctx = FetchContext {
            source_mode: settings.get_source_mode(id),
            manual_cookie: settings.get_manual_cookie(id).cloned(),
            api_key: settings.get_api_key(id).cloned(),
        };

        let provider = providers::create_provider(*id);
        match provider.fetch_usage(&ctx).await {
            Ok(usage) => {
                if json {
                    results.push(serde_json::json!({
                        "provider": format!("{:?}", id).to_lowercase(),
                        "name": id.display_name(),
                        "plan": usage.account_plan,
                        "email": usage.account_email,
                        "source": usage.source_label,
                    }));
                } else {
                    let plan = usage.account_plan.as_deref().unwrap_or("Unknown");
                    let email = usage.account_email.as_deref().unwrap_or("-");
                    println!(
                        "  {:<10} Plan: {:<12} Account: {}",
                        id.display_name(),
                        plan,
                        email
                    );
                }
            }
            Err(e) => {
                if json {
                    results.push(serde_json::json!({
                        "provider": format!("{:?}", id).to_lowercase(),
                        "name": id.display_name(),
                        "error": e.to_string(),
                    }));
                } else {
                    println!("  {:<10} Error: {}", id.display_name(), e);
                }
            }
        }
    }

    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&results).unwrap_or_default()
        );
    }

    0
}
