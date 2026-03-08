# CodexBar-Windows Frontend Development Plan

**Current state**: 22 source files, ~75KB. 5 providers working with mock data fallback. Dashboard + Settings + Theme system + CopilotLogin dialog all functional. Window: 420x620px borderless tray popup.

---

## Phase 1 — Layout & Responsiveness Polish
**Goal**: Make the 420x620 window work perfectly with the grid layout

**Tasks**:
1. The 420px window is too narrow for 3 columns — switch to **2-column grid** with cards that scroll vertically, or auto-adapt (`grid-cols-2` at 420px, `grid-cols-3` at wider browser preview)
2. Add responsive breakpoints: `grid-cols-1` under 300px, `grid-cols-2` at 420px tray, `grid-cols-3` at 800px+ browser
3. Fix `overflow: hidden` on body — the main content area needs `overflow-y: auto` to scroll provider cards
4. Add a smooth scroll-to-top when switching between MainWindow and Settings
5. Test all 5 provider cards fitting without clipping in the 420x620 window

**Files**: `MainWindow.tsx`, `index.css`

---

## Phase 2 — Usage Trend Charts
**Goal**: Visualize the trend data that's already being fetched

**Tasks**:
1. Create a `TrendChart.tsx` component — mini sparkline chart (50px wide, 20px tall) per provider card
2. Use inline SVG `<polyline>` or `<path>` — no external chart library needed for sparklines
3. Show the last 6–8 data points from `UsageTrend.points[]`
4. Color the sparkline based on trend direction (red rising, green falling, gray steady)
5. Add a "Details" expandable section on each ProviderCard — click to expand and see a larger chart (full-width, 80px tall) with axis labels
6. Add hover tooltip on chart points showing exact % and timestamp

**Files**: new `TrendChart.tsx`, `ProviderCard.tsx`

---

## Phase 3 — Notification Preview & Toast UI
**Goal**: Give users control over notification appearance

**Tasks**:
1. Create a `NotificationPreview.tsx` component — shows a mock Windows toast notification preview
2. Add to General tab in Settings: notification type selector (system toast, in-app banner, both)
3. Add "Test Notification" button that fires a sample toast via Tauri notification plugin
4. Create an **in-app notification banner** component (`NotificationBanner.tsx`) that slides down from top when usage crosses warning/critical thresholds
5. Wire the `warningThreshold` and `criticalThreshold` settings to actually trigger these banners in `MainWindow.tsx`
6. Add notification sound selector (default, custom, none) — ties into `soundEnabled` setting

**Files**: new `NotificationPreview.tsx`, new `NotificationBanner.tsx`, `Settings.tsx`, `MainWindow.tsx`

---

## Phase 4 — Status Page Integration
**Goal**: Show detailed provider status beyond colored dots

**Tasks**:
1. Create a `StatusPanel.tsx` component — expandable panel at bottom of MainWindow showing all provider statuses
2. Show per-provider status with name, colored indicator, description text, and last checked time
3. Add a "View Status Page" link per provider (opens statuspage.io URLs)
4. When any provider has an outage, auto-expand the StatusPanel and show a summary banner
5. Replace the minimal `StatusBar.tsx` with this richer component
6. Add status history (last 3 status changes) if data is available

**Files**: new `StatusPanel.tsx`, replace `StatusBar.tsx`, `MainWindow.tsx`

---

## Phase 5 — Keyboard Shortcut Configuration
**Goal**: Make the global shortcut editable, not just display-only

**Tasks**:
1. Create a `ShortcutInput.tsx` component — captures key combinations on focus
2. Display current shortcut as styled keycaps (e.g., `Ctrl` + `Shift` + `U`)
3. On click, enter "recording" mode — show "Press keys..." and capture the next key combo
4. Validate the combo (must have modifier + key, no single letters)
5. Save via `updateSettings()` and call a Tauri command to re-register the global shortcut
6. Add a "Reset to default" button

**Files**: new `ShortcutInput.tsx`, `Settings.tsx`

---

## Phase 6 — Autostart Integration
**Goal**: Wire the "Launch at startup" toggle to actual Tauri autostart commands

**Tasks**:
1. In `useSettings.ts`, on mount call `get_autostart()` to sync the toggle state
2. When toggle changes, call `set_autostart(enabled)` via Tauri command
3. Add error handling — if autostart registration fails, show inline error and revert toggle
4. Add a note under the toggle: "Adds CodexBar to Windows Startup apps"

**Files**: `useSettings.ts`, `api.ts`, `Settings.tsx`

---

## Phase 7 — Provider Credential Management
**Goal**: Better auth UX beyond manual cookie paste

**Tasks**:
1. Add per-provider **auth status indicator** in the Auth tab — show "Authenticated", "Expired", "Not configured" with colored badges
2. Add a "Test Connection" button per provider that calls `refresh_provider()` and shows success/failure
3. For OAuth providers (Claude, Codex, Gemini) — add "Sign in" button that initiates OAuth flow
4. For CLI providers — add "Check CLI" button that verifies CLI is installed and logged in
5. Add API key input field for providers supporting it (Codex) with show/hide toggle
6. Create `AuthStatusBadge.tsx` component for reuse

**Files**: new `AuthStatusBadge.tsx`, `Settings.tsx` (Auth tab), `api.ts`

---

## Phase 8 — Right-Click Context Menu
**Goal**: Add a proper context menu on provider cards

**Tasks**:
1. Create `ContextMenu.tsx` — a floating menu component with items
2. Right-click on a provider card shows: Refresh, Open Dashboard, Copy Usage, Disable Provider
3. "Copy Usage" copies formatted text like "Claude: 58% remaining (session), 82% remaining (weekly)"
4. Style the context menu to match the theme system

**Files**: new `ContextMenu.tsx`, `ProviderCard.tsx`

---

## Phase 9 — Drag-to-Reorder & Card Customization
**Goal**: Let users customize the dashboard layout

**Tasks**:
1. Add drag handles to provider cards (grip icon on the left)
2. Implement drag-to-reorder using pointer events (no external library)
3. Save card order in Settings as `providerOrder: string[]`
4. Add a "Compact view" toggle — switches between full cards (with all bars) and a minimal single-line-per-provider list view
5. Add `viewMode: "grid" | "compact"` to Settings type and Display tab

**Files**: `MainWindow.tsx`, `ProviderCard.tsx`, new `CompactProviderRow.tsx`, `types.ts`, `Settings.tsx`

---

## Phase 10 — Animations & Micro-interactions
**Goal**: Polish the feel of the app

**Tasks**:
1. Add staggered fade-in animation for provider cards on load (each card delays 50ms)
2. Add smooth progress bar transitions when usage data updates (already partially done with CSS)
3. Add a subtle pulse animation on the percentage text when it changes
4. Add page transition animation between MainWindow and Settings (slide left/right)
5. Add hover scale effect on provider cards (`transform: scale(1.02)`)
6. Add a loading shimmer/skeleton screen instead of just a spinner
7. Respect the `animationsEnabled` setting — disable all animations when off

**Files**: `index.css`, `MainWindow.tsx`, `ProviderCard.tsx`, `App.tsx`, new `Skeleton.tsx`

---

## Phase 11 — Diagnostics & Debug Panel
**Goal**: Make diagnostics more useful than a clipboard dump

**Tasks**:
1. Create a `DiagnosticsPanel.tsx` — modal/overlay showing structured diagnostics
2. Show: app version, OS version, enabled providers, auth status per provider, last refresh timestamps, error logs
3. Add a "Refresh log" section — last 10 refresh attempts with success/fail/duration
4. Keep the "Copy to clipboard" button but also add "Save to file" option
5. Add a hidden "Debug mode" toggle (triple-click the version number in About tab) that shows raw API responses

**Files**: new `DiagnosticsPanel.tsx`, `Settings.tsx` (About tab)

---

## Phase 12 — Accessibility & Final Polish
**Goal**: Production-ready accessibility and quality

**Tasks**:
1. Add proper `aria-label` attributes to all icon-only buttons (refresh, settings, close)
2. Add keyboard navigation — Tab through cards, Enter to expand, Escape to close Settings
3. Ensure all color contrasts meet WCAG AA (especially in light mode — `--text-muted` on white may be too faint)
4. Add `prefers-reduced-motion` media query support (disable animations system-wide)
5. Add focus-visible ring styles for keyboard users
6. Test with Windows Narrator screen reader
7. Add `<title>` to all SVG icons for tooltips
8. Final bundle size audit — check no unused dependencies

**Files**: `index.css`, all component files

---

## Summary

| Phase | Focus | New Files | Priority |
|-------|-------|-----------|----------|
| 1 | Layout & Responsiveness | 0 | High |
| 2 | Trend Charts | 1 | High |
| 3 | Notifications | 2 | High |
| 4 | Status Page | 1 | High |
| 5 | Shortcut Config | 1 | Medium |
| 6 | Autostart Wiring | 0 | Medium |
| 7 | Credential Management | 1 | Medium |
| 8 | Context Menu | 1 | Medium |
| 9 | Drag Reorder & Views | 1 | Low |
| 10 | Animations | 1 | Low |
| 11 | Diagnostics Panel | 1 | Low |
| 12 | Accessibility | 0 | Low |

**Phases 1–4**: Core UX gaps (do first)
**Phases 5–8**: Important usability improvements
**Phases 9–12**: Polish for production release
