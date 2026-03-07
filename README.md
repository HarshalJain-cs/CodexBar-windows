# CodexBar for Windows

A system tray application that monitors your AI coding assistant usage quotas in real-time. Track usage across Claude, Codex, Cursor, Gemini, and GitHub Copilot from a single dashboard.

Windows port inspired by [CodexBar for macOS](https://github.com/steipete/CodexBar).

## Features

- **System tray icon** with dynamic dual-bar visualization of session and weekly usage
- **5 AI providers**: Claude, Codex (ChatGPT), Cursor, Google Gemini, GitHub Copilot
- **Multiple auth methods**: OAuth tokens, browser cookies (DPAPI decryption), API keys, GitHub device flow
- **Per-provider auth configuration**: choose source mode (Auto/OAuth/Web/CLI/API Key) and paste manual cookies
- **Windows toast notifications** when usage crosses warning/critical thresholds
- **Global keyboard shortcut** (Ctrl+Shift+U) to toggle the dashboard
- **CLI tool** (`codexbar`) for terminal-based usage monitoring with colored output and JSON mode
- **Diagnostics export**: redacted system info bundle for troubleshooting (CLI + UI)
- **Provider status pages**: inline statuspage.io integration for Codex, Claude, Cursor, and Copilot
- **Auto-update** via GitHub Releases
- **Launch at startup** via Windows registry
- **Single instance** enforcement — only one CodexBar runs at a time

## Installation

### Installer (recommended)
Download the latest `CodexBar_*_x64-setup.exe` from [Releases](https://github.com/HarshalJain-cs/CodexBar-windows/releases).

### MSI (enterprise)
Download `CodexBar_*_x64_en-US.msi` for GPO/SCCM deployment.

### CLI only
Download `codexbar.exe` from Releases and add to your PATH.

## CLI Usage

```bash
# Show usage for enabled providers
codexbar usage

# Show all providers with JSON output
codexbar usage --all --json

# Include provider status page info
codexbar usage --status

# Filter by provider
codexbar usage -p claude

# Show cost/plan info
codexbar cost

# Show account info
codexbar account status

# Login to GitHub Copilot (device flow)
codexbar account login copilot

# Manage settings
codexbar config list
codexbar config set refresh_interval_secs 120
codexbar config validate

# Export diagnostics
codexbar diagnostics
codexbar diagnostics --json
codexbar diagnostics --output diag.json
```

## Settings UI

The Settings window has 5 tabs:

- **General**: Refresh interval, notifications, startup, thresholds, keyboard shortcut
- **Providers**: Enable/disable each provider
- **Auth**: Per-provider source mode, manual cookie paste, Copilot GitHub sign-in
- **Display**: Usage display mode, reset time format, animations, privacy mode
- **About**: Version, links, check for updates, export diagnostics

## Building from Source

### Prerequisites
- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 22+
- Windows 10/11

### Build

```bash
# Install frontend dependencies
npm install

# Development mode
npm run tauri dev

# Production build
npm run tauri build

# CLI binary only
cd src-tauri && cargo build --bin codexbar --release
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Tauri v2 (Rust)
- **Providers**: reqwest HTTP, DPAPI cookie decryption, OAuth flows
- **Distribution**: MSI + NSIS installers via GitHub Actions

## Architecture

```
src-tauri/
  src/
    core/           # Data models (RateWindow, UsageSnapshot, Provider trait)
    providers/      # Claude, Codex, Cursor, Gemini, Copilot implementations
    browser/        # Cookie extraction (Chrome, Edge, Brave, Firefox)
    tray/           # Dynamic icon renderer, tooltip, animation
    cli/            # CLI binary (usage, cost, config, account, diagnostics)
    refresh.rs      # Shared provider refresh logic
    notifications.rs # Windows toast notification system
    settings.rs     # Persistent settings (%APPDATA%/CodexBar/settings.json)
    state.rs        # Shared application state
    commands.rs     # Tauri command bridge + diagnostics export
src/
  pages/            # MainWindow, Settings (5 tabs)
  components/       # ProviderCard, ProgressBar, CopilotLoginDialog, etc.
  hooks/            # useUsageData, useSettings, useProviderStatus
  lib/              # API client, types, colors
```

## Auto-Update

CodexBar checks for updates on startup and via the Settings > About tab. To enable signed auto-updates for your fork:

1. Generate a signing key pair: `npx @tauri-apps/cli signer generate`
2. Set the public key in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`
3. Set `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in your GitHub Actions secrets
4. The release workflow will sign update artifacts automatically

## License

MIT
