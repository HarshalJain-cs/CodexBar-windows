# CodexBar for Windows

A system tray application that monitors your AI coding assistant usage quotas in real-time. Track usage across Claude, Codex, Cursor, Gemini, GitHub Copilot, and more from a single dashboard.

Windows port inspired by [CodexBar for macOS](https://github.com/steipete/CodexBar).

## Features

### Core Monitoring
- **System tray icon** with dynamic dual-bar visualization of session and weekly usage
- **9 AI providers**: Claude, Codex (ChatGPT), Cursor, Google Gemini, GitHub Copilot, Windsurf, Kiro, Augment, Devin
- **5 backend-supported providers** with real-time data fetching (Claude, Codex, Cursor, Gemini, Copilot)
- **Multiple auth methods**: OAuth tokens, browser cookies (DPAPI decryption), API keys, GitHub device flow
- **Auto-refresh** with configurable per-provider intervals and pause/resume control

### Dashboard
- **3 view modes**: Grid cards, Compact list, or Grouped by category (AI Coding / AI Chat / AI Agent)
- **Usage predictions & burndown**: Shows estimated time until limit based on current usage rate
- **Weekly summary**: Avg session/weekly usage, most/least used provider, at-risk providers
- **Provider comparison** bar chart with per-provider color coding
- **Session summary**: Average usage, peak provider, rising trends, refresh count
- **Usage history chart**: 8h/24h/7d views with toggleable provider visibility
- **Drag-to-reorder** and **pin providers** to customize layout
- **Search & filter** providers by name
- **Focus mode**: Show only providers approaching thresholds
- **Privacy mode**: Mask all usage values with dots

### Notifications & Alerts
- **Dual notification system**: Windows toast + in-app banners
- **Per-provider thresholds**: Custom warning/critical levels per provider
- **Webhook notifications**: Send alerts to Discord, Slack, or custom webhook endpoints
- **Alerts history log**: View past threshold crossings with timestamps
- **Notification sounds**: Configurable system sounds for warnings and critical alerts

### UI & UX
- **Command palette** (Ctrl+K): Quick actions for refresh, settings, export, privacy toggle
- **Keyboard shortcuts**: Ctrl+R refresh, Ctrl+, settings, Ctrl+E export, 1-9 select provider, ? help
- **Dark/Light/System themes** with customizable accent color
- **Framer Motion animations** with reduced motion support
- **Skeleton loading** cards during data fetch
- **Error boundary** for graceful crash recovery
- **Onboarding overlay** for first-time users
- **Auto-update banner** with GitHub Releases integration

### System Integration
- **Global keyboard shortcut** (Ctrl+Shift+U) to toggle the dashboard
- **Launch at startup** via Windows Startup apps
- **Single instance** enforcement
- **Window position memory** across restarts
- **Status page monitoring** via statuspage.io with persisted history

### Data & Export
- **CSV export** with BOM for Excel compatibility and all provider fields
- **JSON export** for programmatic use
- **Settings import/export** with Zod validation
- **Diagnostics bundle** export (redacted credentials) for troubleshooting

### CLI Tool
- **`codexbar usage`**: Colored terminal output with progress bars, JSON mode, status page info
- **`codexbar cost`**: Plan and account info
- **`codexbar account`**: Credential status, login/logout (GitHub device flow for Copilot)
- **`codexbar config`**: List, get, set, validate settings
- **`codexbar diagnostics`**: Full diagnostic export

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

## Settings

The Settings window has 5 tabs:

- **General**: Refresh interval, startup, shortcuts, notifications (system/in-app/both), sounds, thresholds, webhook alerts
- **Display**: Theme (dark/light/system), animations, view mode (grid/compact/grouped), accent color, data retention
- **Providers**: Enable/disable each of 9 providers, per-provider custom warning/critical thresholds
- **Auth**: Credential status per provider with test/re-auth buttons, connection verification
- **About**: Version, settings backup (export/import), check for updates, debug mode (triple-click version)

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

- **Frontend**: React 19 + TypeScript + Tailwind CSS v3 + shadcn/ui + Framer Motion + Recharts
- **Backend**: Tauri v2 (Rust) with 8 plugins (autostart, clipboard, global-shortcut, notification, shell, store, updater)
- **Providers**: reqwest HTTP, DPAPI + AES-256-GCM cookie decryption, OAuth flows, GitHub device flow
- **Distribution**: MSI + NSIS installers via GitHub Actions

## Architecture

```
src-tauri/
  src/
    core/           # Data models (RateWindow, UsageSnapshot, Provider trait, Credentials)
    providers/      # Claude (OAuth+Web), Codex, Cursor, Gemini, Copilot (device flow)
    browser/        # Cookie extraction (Chrome, Edge, Brave, Firefox) via DPAPI
    tray/           # Dynamic 32x32 icon renderer, tooltip, animation state machine
    cli/            # CLI binary (usage, cost, config, account, autostart, diagnostics)
    refresh.rs      # Parallel provider refresh with per-provider intervals
    notifications.rs # Windows toast + webhook notifications (Discord/Slack)
    settings.rs     # Persistent settings (%APPDATA%/CodexBar/settings.json)
    state.rs        # Thread-safe AppState with RwLock (snapshots, statuses, history)
    commands.rs     # 16 Tauri commands bridging frontend to backend
    sound.rs        # Windows MessageBeep FFI for alert sounds
    single_instance.rs # Mutex-based single instance guard
src/
  components/       # 31 React components (MainWindow, SettingsPage, ProviderCard, etc.)
  hooks/            # useProviders, useSettings, useKeyboardShortcuts, useNotifications
  data/             # Mock data fallback, provider logos
  types.ts          # Full TypeScript type definitions
```

## Auto-Update

CodexBar checks for updates on startup and via Settings > About. To enable signed auto-updates for your fork:

1. Generate a signing key pair: `npx @tauri-apps/cli signer generate`
2. Set the public key in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`
3. Set `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in your GitHub Actions secrets
4. The release workflow will sign update artifacts automatically

## License

MIT
