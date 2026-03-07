use clap::{Parser, Subcommand};

mod usage;
mod cost;
mod config;
mod account;
mod diagnostics;

#[derive(Parser)]
#[command(
    name = "codexbar",
    about = "CodexBar CLI - AI coding assistant usage monitor",
    version,
    author
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Show usage for enabled providers
    Usage {
        /// Filter by provider name (codex, claude, cursor, gemini, copilot)
        #[arg(short, long)]
        provider: Option<String>,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Show all providers, not just enabled
        #[arg(short, long)]
        all: bool,

        /// Include status page info
        #[arg(long)]
        status: bool,
    },

    /// Show cost and credits information
    Cost {
        /// Filter by provider name
        #[arg(short, long)]
        provider: Option<String>,

        /// Output as JSON
        #[arg(long)]
        json: bool,
    },

    /// Manage configuration
    Config {
        #[command(subcommand)]
        action: ConfigAction,
    },

    /// Manage provider accounts
    Account {
        #[command(subcommand)]
        action: AccountAction,
    },

    /// Manage autostart
    Autostart {
        #[command(subcommand)]
        action: AutostartAction,
    },

    /// Export diagnostics bundle
    Diagnostics {
        /// Output as JSON (default: human-readable)
        #[arg(long)]
        json: bool,

        /// Save to file instead of stdout
        #[arg(short, long)]
        output: Option<String>,
    },
}

#[derive(Subcommand)]
enum ConfigAction {
    /// List all settings
    List,
    /// Get a setting value
    Get {
        /// Setting key
        key: String,
    },
    /// Set a setting value
    Set {
        /// Setting key
        key: String,
        /// Setting value
        value: String,
    },
    /// Show config file path
    Path,
    /// Validate config files
    Validate,
}

#[derive(Subcommand)]
enum AccountAction {
    /// Show account status for providers
    Status {
        /// Filter by provider
        #[arg(short, long)]
        provider: Option<String>,
    },
    /// Login to a provider
    Login {
        /// Provider name
        provider: String,
    },
    /// Logout from a provider
    Logout {
        /// Provider name
        provider: String,
    },
}

#[derive(Subcommand)]
enum AutostartAction {
    /// Enable autostart
    Enable,
    /// Disable autostart
    Disable,
    /// Show autostart status
    Status,
}

#[tokio::main]
async fn main() {
    // Initialize logging for CLI
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("warn")),
        )
        .with_writer(std::io::stderr)
        .init();

    let cli = Cli::parse();

    let exit_code = match cli.command {
        Commands::Usage {
            provider,
            json,
            all,
            status,
        } => usage::run(provider, json, all, status).await,

        Commands::Cost { provider, json } => cost::run(provider, json).await,

        Commands::Config { action } => match action {
            ConfigAction::List => config::list(),
            ConfigAction::Get { key } => config::get(&key),
            ConfigAction::Set { key, value } => config::set(&key, &value),
            ConfigAction::Path => config::path(),
            ConfigAction::Validate => config::validate(),
        },

        Commands::Account { action } => match action {
            AccountAction::Status { provider } => account::status(provider).await,
            AccountAction::Login { provider } => account::login(&provider).await,
            AccountAction::Logout { provider } => account::logout(&provider),
        },

        Commands::Autostart { action } => match action {
            AutostartAction::Enable => config::autostart_set(true),
            AutostartAction::Disable => config::autostart_set(false),
            AutostartAction::Status => config::autostart_status(),
        },

        Commands::Diagnostics { json, output } => diagnostics::run(json, output).await,
    };

    std::process::exit(exit_code);
}
