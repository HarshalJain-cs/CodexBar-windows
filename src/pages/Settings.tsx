import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import {
  getAvailableProviders,
  checkForUpdates,
  exportDiagnostics,
} from "@/lib/api";
import { CopilotLoginDialog } from "@/components/CopilotLoginDialog";
import type { ProviderInfo, Settings as SettingsType } from "@/lib/types";

interface SettingsProps {
  onBack: () => void;
}

type Tab = "general" | "providers" | "auth" | "display" | "about";

export function Settings({ onBack }: SettingsProps) {
  const { settings, loading, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [availableProviders, setAvailableProviders] = useState<ProviderInfo[]>([]);

  useEffect(() => {
    getAvailableProviders().then(setAvailableProviders).catch(console.error);
  }, []);

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 flex items-center justify-center">
        <span className="text-xs text-zinc-500">Loading settings...</span>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "providers", label: "Providers" },
    { id: "auth", label: "Auth" },
    { id: "display", label: "Display" },
    { id: "about", label: "About" },
  ];

  const toggleProvider = (id: string) => {
    const enabled = new Set(settings.enabledProviders);
    if (enabled.has(id)) {
      enabled.delete(id);
    } else {
      enabled.add(id);
    }
    updateSettings({ ...settings, enabledProviders: Array.from(enabled) });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/50 mb-3">
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {activeTab === "general" && (
          <GeneralTab settings={settings} onUpdate={updateSettings} />
        )}
        {activeTab === "providers" && (
          <ProvidersTab
            settings={settings}
            providers={availableProviders}
            onToggle={toggleProvider}
            onUpdate={updateSettings}
          />
        )}
        {activeTab === "auth" && (
          <AuthTab
            settings={settings}
            providers={availableProviders}
            onUpdate={updateSettings}
          />
        )}
        {activeTab === "display" && (
          <DisplayTab settings={settings} onUpdate={updateSettings} />
        )}
        {activeTab === "about" && <AboutTab />}
      </div>
    </div>
  );
}

function GeneralTab({
  settings,
  onUpdate,
}: {
  settings: SettingsType;
  onUpdate: (s: SettingsType) => void;
}) {
  const intervals = [
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
    { value: 300, label: "5 minutes" },
    { value: 600, label: "10 minutes" },
    { value: 900, label: "15 minutes" },
    { value: 1800, label: "30 minutes" },
  ];

  return (
    <div className="space-y-4">
      <SettingRow label="Refresh interval">
        <select
          value={settings.refreshIntervalSecs}
          onChange={(e) =>
            onUpdate({ ...settings, refreshIntervalSecs: Number(e.target.value) })
          }
          className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700"
        >
          {intervals.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </SettingRow>

      <SettingRow label="Notifications">
        <Toggle
          checked={settings.notificationsEnabled}
          onChange={(v) => onUpdate({ ...settings, notificationsEnabled: v })}
        />
      </SettingRow>

      <SettingRow label="Sound alerts">
        <Toggle
          checked={settings.soundEnabled}
          onChange={(v) => onUpdate({ ...settings, soundEnabled: v })}
        />
      </SettingRow>

      <SettingRow label="Launch at startup">
        <Toggle
          checked={settings.startAtLogin}
          onChange={(v) => onUpdate({ ...settings, startAtLogin: v })}
        />
      </SettingRow>

      <SettingRow label="Warning threshold">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={50}
            max={95}
            step={5}
            value={settings.warningThreshold}
            onChange={(e) =>
              onUpdate({ ...settings, warningThreshold: Number(e.target.value) })
            }
            className="w-24 accent-yellow-500"
          />
          <span className="text-[10px] text-zinc-400 w-8">
            {settings.warningThreshold}%
          </span>
        </div>
      </SettingRow>

      <SettingRow label="Critical threshold">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={80}
            max={100}
            step={5}
            value={settings.criticalThreshold}
            onChange={(e) =>
              onUpdate({ ...settings, criticalThreshold: Number(e.target.value) })
            }
            className="w-24 accent-red-500"
          />
          <span className="text-[10px] text-zinc-400 w-8">
            {settings.criticalThreshold}%
          </span>
        </div>
      </SettingRow>

      <SettingRow label="Keyboard shortcut">
        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-1 rounded font-mono">
          {settings.globalShortcut}
        </span>
      </SettingRow>
    </div>
  );
}

const providerIntervalOptions = [
  { value: 0, label: "Default" },
  { value: 60, label: "1 min" },
  { value: 120, label: "2 min" },
  { value: 300, label: "5 min" },
  { value: 600, label: "10 min" },
  { value: 900, label: "15 min" },
  { value: 1800, label: "30 min" },
];

function ProvidersTab({
  settings,
  providers,
  onToggle,
  onUpdate,
}: {
  settings: SettingsType;
  providers: ProviderInfo[];
  onToggle: (id: string) => void;
  onUpdate: (s: SettingsType) => void;
}) {
  const getProviderInterval = (id: string) =>
    settings.providerRefreshIntervals?.[id] ?? 0;

  const setProviderInterval = (id: string, secs: number) => {
    const intervals = { ...settings.providerRefreshIntervals };
    if (secs === 0) {
      delete intervals[id];
    } else {
      intervals[id] = secs;
    }
    onUpdate({ ...settings, providerRefreshIntervals: intervals });
  };

  return (
    <div className="space-y-2">
      {providers.map((p) => {
        const isEnabled = settings.enabledProviders.includes(p.id);
        return (
          <div
            key={p.id}
            className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-zinc-200">{p.name}</div>
                <div className="text-[10px] text-zinc-500">{p.id}</div>
              </div>
              <Toggle
                checked={isEnabled}
                onChange={() => onToggle(p.id)}
              />
            </div>
            {isEnabled && (
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10px] text-zinc-500">Refresh interval</span>
                <select
                  value={getProviderInterval(p.id)}
                  onChange={(e) => setProviderInterval(p.id, Number(e.target.value))}
                  className="bg-zinc-800 text-zinc-300 text-[10px] rounded px-1.5 py-0.5 border border-zinc-700"
                >
                  {providerIntervalOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AuthTab({
  settings,
  providers,
  onUpdate,
}: {
  settings: SettingsType;
  providers: ProviderInfo[];
  onUpdate: (s: SettingsType) => void;
}) {
  const [copilotDialogOpen, setCopilotDialogOpen] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const getSourceMode = (id: string) => settings.providerSources[id] || "auto";
  const setSourceMode = (id: string, mode: string) => {
    onUpdate({
      ...settings,
      providerSources: { ...settings.providerSources, [id]: mode },
    });
  };

  const getManualCookie = (id: string) => settings.manualCookies[id] || "";
  const setManualCookie = (id: string, cookie: string) => {
    const cookies = { ...settings.manualCookies };
    if (cookie) {
      cookies[id] = cookie;
    } else {
      delete cookies[id];
    }
    onUpdate({ ...settings, manualCookies: cookies });
  };

  const getAvailableModes = (p: ProviderInfo) => {
    const modes = [{ value: "auto", label: "Auto" }];
    if (p.supportsOauth) modes.push({ value: "oauth", label: "OAuth" });
    if (p.supportsCookies) modes.push({ value: "web", label: "Web/Cookies" });
    if (p.supportsCli) modes.push({ value: "cli", label: "CLI" });
    if (p.supportsApiKey) modes.push({ value: "apikey", label: "API Key" });
    return modes;
  };

  const getAuthHint = (p: ProviderInfo) => {
    const methods: string[] = [];
    if (p.supportsOauth) methods.push("OAuth");
    if (p.supportsCookies) methods.push("Cookies");
    if (p.supportsCli) methods.push("CLI");
    if (p.supportsApiKey) methods.push("API Key");
    return methods.join(" / ");
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-zinc-500 pb-1">
        Configure how each provider authenticates. Most work automatically.
      </p>
      {providers.map((p) => {
        const isExpanded = expandedProvider === p.id;
        const currentMode = getSourceMode(p.id);
        const modes = getAvailableModes(p);

        return (
          <div
            key={p.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden"
          >
            {/* Provider header */}
            <button
              onClick={() => setExpandedProvider(isExpanded ? null : p.id)}
              className="w-full flex items-center justify-between p-2.5 hover:bg-zinc-800/30 transition-colors"
            >
              <div className="text-left">
                <div className="text-xs font-medium text-zinc-200">{p.name}</div>
                <div className="text-[10px] text-zinc-500">{getAuthHint(p)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  {currentMode}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-3 pb-3 space-y-3 border-t border-zinc-800/50">
                {/* Source mode selector */}
                <div className="pt-2">
                  <label className="text-[10px] text-zinc-400 block mb-1">Source mode</label>
                  <div className="flex flex-wrap gap-1">
                    {modes.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setSourceMode(p.id, m.value)}
                        className={`text-[10px] px-2 py-1 rounded transition-colors ${
                          currentMode === m.value
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual cookie paste for cookie-based providers */}
                {p.supportsCookies && (
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">
                      Manual cookie (optional fallback)
                    </label>
                    <textarea
                      value={getManualCookie(p.id)}
                      onChange={(e) => setManualCookie(p.id, e.target.value)}
                      placeholder="Paste cookie header value here..."
                      rows={2}
                      className="w-full bg-zinc-800 text-zinc-200 text-[10px] rounded px-2 py-1.5 border border-zinc-700 resize-none font-mono placeholder:text-zinc-600"
                    />
                    <p className="text-[9px] text-zinc-600 mt-0.5">
                      Only needed if auto cookie extraction fails.
                    </p>
                  </div>
                )}

                {/* Copilot sign-in button */}
                {p.id === "copilot" && (
                  <button
                    onClick={() => setCopilotDialogOpen(true)}
                    className="w-full text-xs px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700"
                  >
                    Sign in with GitHub
                  </button>
                )}

                {/* CLI-based providers: show instructions */}
                {p.supportsCli && p.id !== "copilot" && (
                  <p className="text-[9px] text-zinc-500">
                    {p.id === "claude" && "OAuth: run `claude login` in terminal"}
                    {p.id === "codex" && "OAuth: run `codex login` in terminal"}
                    {p.id === "gemini" && "OAuth: run `gemini auth login` in terminal"}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <CopilotLoginDialog
        open={copilotDialogOpen}
        onClose={() => setCopilotDialogOpen(false)}
        onSuccess={() => setCopilotDialogOpen(false)}
      />
    </div>
  );
}

function DisplayTab({
  settings,
  onUpdate,
}: {
  settings: SettingsType;
  onUpdate: (s: SettingsType) => void;
}) {
  return (
    <div className="space-y-4">
      <SettingRow label="Theme">
        <select
          value={settings.theme}
          onChange={(e) => onUpdate({ ...settings, theme: e.target.value })}
          className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </SettingRow>

      <SettingRow label="Show usage as">
        <select
          value={settings.showAsUsed ? "used" : "remaining"}
          onChange={(e) =>
            onUpdate({ ...settings, showAsUsed: e.target.value === "used" })
          }
          className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700"
        >
          <option value="remaining">Remaining</option>
          <option value="used">Used</option>
        </select>
      </SettingRow>

      <SettingRow label="Reset time format">
        <select
          value={settings.resetTimeFormat}
          onChange={(e) =>
            onUpdate({ ...settings, resetTimeFormat: e.target.value })
          }
          className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700"
        >
          <option value="relative">Relative (2h 30m)</option>
          <option value="absolute">Absolute (3:00 PM)</option>
        </select>
      </SettingRow>

      <SettingRow label="Animations">
        <Toggle
          checked={settings.animationsEnabled}
          onChange={(v) => onUpdate({ ...settings, animationsEnabled: v })}
        />
      </SettingRow>

      <SettingRow label="Privacy mode">
        <Toggle
          checked={settings.privacyMode}
          onChange={(v) => onUpdate({ ...settings, privacyMode: v })}
        />
      </SettingRow>
    </div>
  );
}

function AboutTab() {
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [diagCopied, setDiagCopied] = useState(false);

  const handleCheckUpdates = async () => {
    setChecking(true);
    setUpdateStatus(null);
    try {
      const result = await checkForUpdates();
      setUpdateStatus(result ? result : "Up to date");
    } catch (err) {
      setUpdateStatus(`Error: ${err}`);
    } finally {
      setChecking(false);
    }
  };

  const handleExportDiagnostics = async () => {
    try {
      const diag = await exportDiagnostics();
      // Copy to clipboard
      navigator.clipboard.writeText(diag);
      setDiagCopied(true);
      setTimeout(() => setDiagCopied(false), 2000);
    } catch (err) {
      console.error("Failed to export diagnostics:", err);
    }
  };

  return (
    <div className="space-y-3 text-center py-4">
      <div>
        <div className="text-sm font-semibold">CodexBar for Windows</div>
        <div className="text-[10px] text-zinc-500 font-mono">v0.2.0</div>
      </div>
      <p className="text-xs text-zinc-400 max-w-[280px] mx-auto">
        Monitor your AI coding assistant usage quotas from the system tray.
      </p>
      <div className="space-y-1 text-xs">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            import("@/lib/api").then(({ openUrl }) =>
              openUrl("https://github.com/HarshalJain-cs/CodexBar-windows"),
            );
          }}
          className="text-blue-400 hover:underline block"
        >
          GitHub Repository
        </a>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            import("@/lib/api").then(({ openUrl }) =>
              openUrl("https://github.com/steipete/CodexBar"),
            );
          }}
          className="text-zinc-500 hover:underline block"
        >
          Based on CodexBar by steipete
        </a>
      </div>

      {/* Check for updates */}
      <div className="pt-2 space-y-2">
        <button
          onClick={handleCheckUpdates}
          disabled={checking}
          className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 transition-colors border border-zinc-700"
        >
          {checking ? "Checking..." : "Check for Updates"}
        </button>
        {updateStatus && (
          <div className="text-[10px] text-zinc-400">{updateStatus}</div>
        )}
      </div>

      {/* Export diagnostics */}
      <div>
        <button
          onClick={handleExportDiagnostics}
          className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors border border-zinc-700"
        >
          {diagCopied ? "Copied to clipboard!" : "Export Diagnostics"}
        </button>
        <p className="text-[9px] text-zinc-600 mt-1">
          Copies redacted system info for troubleshooting
        </p>
      </div>

      <div className="text-[10px] text-zinc-600">MIT License</div>
    </div>
  );
}

/* Reusable components */

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-zinc-300">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-blue-600" : "bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
