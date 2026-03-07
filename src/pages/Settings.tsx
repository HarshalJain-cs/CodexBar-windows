import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import {
  getAvailableProviders,
  checkForUpdates,
  exportDiagnostics,
  openUrl,
} from "@/lib/api";
import { CopilotLoginDialog } from "@/components/CopilotLoginDialog";
import type { ProviderInfo, Settings as SettingsType } from "@/lib/types";

interface SettingsProps {
  onBack: () => void;
}

type Tab = "general" | "providers" | "auth" | "display" | "about";

const tabMeta: { id: Tab; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "\u2699\uFE0F" },
  { id: "providers", label: "Providers", icon: "\u{1F4E1}" },
  { id: "auth", label: "Auth", icon: "\u{1F511}" },
  { id: "display", label: "Display", icon: "\u{1F3A8}" },
  { id: "about", label: "About", icon: "\u{2139}\uFE0F" },
];

export function Settings({ onBack }: SettingsProps) {
  const { settings, loading, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [availableProviders, setAvailableProviders] = useState<ProviderInfo[]>([]);

  useEffect(() => {
    getAvailableProviders().then(setAvailableProviders).catch(console.error);
  }, []);

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading settings...</span>
      </div>
    );
  }

  const toggleProvider = (id: string) => {
    const enabled = new Set(settings.enabledProviders);
    if (enabled.has(id)) enabled.delete(id);
    else enabled.add(id);
    updateSettings({ ...settings, enabledProviders: Array.from(enabled) });
  };

  return (
    <div className="min-h-screen flex flex-col p-4" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onBack}
          className="p-2 rounded-lg transition-all"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      </div>

      {/* Tab Navigation - Big */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--bg-overlay)' }}>
        {tabMeta.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 text-sm font-semibold px-3 py-2.5 rounded-lg transition-all"
            style={{
              background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto animate-fade-in">
        {activeTab === "general" && <GeneralTab settings={settings} onUpdate={updateSettings} />}
        {activeTab === "providers" && (
          <ProvidersTab settings={settings} providers={availableProviders} onToggle={toggleProvider} onUpdate={updateSettings} />
        )}
        {activeTab === "auth" && <AuthTab settings={settings} providers={availableProviders} onUpdate={updateSettings} />}
        {activeTab === "display" && <DisplayTab settings={settings} onUpdate={updateSettings} />}
        {activeTab === "about" && <AboutTab />}
      </div>
    </div>
  );
}

/* ========= General Tab ========= */
function GeneralTab({ settings, onUpdate }: { settings: SettingsType; onUpdate: (s: SettingsType) => void }) {
  const intervals = [
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
    { value: 300, label: "5 minutes" },
    { value: 600, label: "10 minutes" },
    { value: 900, label: "15 minutes" },
  ];

  return (
    <div className="space-y-1">
      <SettingRow label="Refresh interval" desc="How often to fetch new data">
        <select
          value={settings.refreshIntervalSecs}
          onChange={(e) => onUpdate({ ...settings, refreshIntervalSecs: Number(e.target.value) })}
          className="cb-input text-sm"
        >
          {intervals.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
      </SettingRow>

      <SettingRow label="Notifications" desc="Alert when usage is high">
        <Toggle checked={settings.notificationsEnabled} onChange={(v) => onUpdate({ ...settings, notificationsEnabled: v })} />
      </SettingRow>

      <SettingRow label="Sound alerts" desc="Play sounds for warnings">
        <Toggle checked={settings.soundEnabled} onChange={(v) => onUpdate({ ...settings, soundEnabled: v })} />
      </SettingRow>

      <SettingRow label="Launch at startup" desc="Start with Windows">
        <Toggle checked={settings.startAtLogin} onChange={(v) => onUpdate({ ...settings, startAtLogin: v })} />
      </SettingRow>

      <SettingRow label="Warning threshold" desc={`Alert at ${settings.warningThreshold}%`}>
        <div className="flex items-center gap-2">
          <input
            type="range" min={50} max={95} step={5}
            value={settings.warningThreshold}
            onChange={(e) => onUpdate({ ...settings, warningThreshold: Number(e.target.value) })}
            className="w-24 accent-orange-500"
          />
          <span className="text-sm font-mono w-8 text-right" style={{ color: 'var(--text-tertiary)' }}>
            {settings.warningThreshold}%
          </span>
        </div>
      </SettingRow>

      <SettingRow label="Critical threshold" desc={`Alert at ${settings.criticalThreshold}%`}>
        <div className="flex items-center gap-2">
          <input
            type="range" min={80} max={100} step={5}
            value={settings.criticalThreshold}
            onChange={(e) => onUpdate({ ...settings, criticalThreshold: Number(e.target.value) })}
            className="w-24 accent-red-500"
          />
          <span className="text-sm font-mono w-8 text-right" style={{ color: 'var(--text-tertiary)' }}>
            {settings.criticalThreshold}%
          </span>
        </div>
      </SettingRow>

      <SettingRow label="Keyboard shortcut">
        <span className="cb-badge text-sm font-mono">{settings.globalShortcut}</span>
      </SettingRow>
    </div>
  );
}

/* ========= Providers Tab ========= */
const refreshOptions = [
  { value: 0, label: "Default" },
  { value: 60, label: "1m" },
  { value: 300, label: "5m" },
  { value: 600, label: "10m" },
  { value: 1800, label: "30m" },
];

function ProvidersTab({ settings, providers, onToggle, onUpdate }: {
  settings: SettingsType; providers: ProviderInfo[]; onToggle: (id: string) => void; onUpdate: (s: SettingsType) => void;
}) {
  const getInterval = (id: string) => settings.providerRefreshIntervals?.[id] ?? 0;
  const setInterval = (id: string, secs: number) => {
    const intervals = { ...settings.providerRefreshIntervals };
    if (secs === 0) delete intervals[id]; else intervals[id] = secs;
    onUpdate({ ...settings, providerRefreshIntervals: intervals });
  };

  return (
    <div className="space-y-3">
      {providers.map((p) => {
        const enabled = settings.enabledProviders.includes(p.id);
        return (
          <div key={p.id} className="cb-card" style={{ padding: '14px' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.id}</div>
              </div>
              <Toggle checked={enabled} onChange={() => onToggle(p.id)} />
            </div>
            {enabled && (
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Refresh</span>
                <select
                  value={getInterval(p.id)}
                  onChange={(e) => setInterval(p.id, Number(e.target.value))}
                  className="cb-input text-xs py-1 px-2"
                >
                  {refreshOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ========= Auth Tab ========= */
function AuthTab({ settings, providers, onUpdate }: {
  settings: SettingsType; providers: ProviderInfo[]; onUpdate: (s: SettingsType) => void;
}) {
  const [copilotDialogOpen, setCopilotDialogOpen] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const getSourceMode = (id: string) => settings.providerSources[id] || "auto";
  const setSourceMode = (id: string, mode: string) => {
    onUpdate({ ...settings, providerSources: { ...settings.providerSources, [id]: mode } });
  };

  const getManualCookie = (id: string) => settings.manualCookies[id] || "";
  const setManualCookie = (id: string, cookie: string) => {
    const cookies = { ...settings.manualCookies };
    if (cookie) cookies[id] = cookie; else delete cookies[id];
    onUpdate({ ...settings, manualCookies: cookies });
  };

  const getModes = (p: ProviderInfo) => {
    const modes = [{ value: "auto", label: "Auto" }];
    if (p.supportsOauth) modes.push({ value: "oauth", label: "OAuth" });
    if (p.supportsCookies) modes.push({ value: "web", label: "Web" });
    if (p.supportsCli) modes.push({ value: "cli", label: "CLI" });
    if (p.supportsApiKey) modes.push({ value: "apikey", label: "API Key" });
    return modes;
  };

  return (
    <div className="space-y-3">
      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
        Configure authentication method for each provider.
      </p>
      {providers.map((p) => {
        const isExpanded = expandedProvider === p.id;
        const currentMode = getSourceMode(p.id);
        const modes = getModes(p);

        return (
          <div key={p.id} className="cb-card overflow-hidden">
            <button
              onClick={() => setExpandedProvider(isExpanded ? null : p.id)}
              className="w-full flex items-center justify-between p-3.5 transition-colors"
              style={{ background: isExpanded ? 'var(--bg-hover)' : 'transparent' }}
              onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="text-left">
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {[p.supportsOauth && "OAuth", p.supportsCookies && "Cookies", p.supportsCli && "CLI", p.supportsApiKey && "API Key"].filter(Boolean).join(" / ")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="cb-badge text-xs font-mono">{currentMode}</span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="px-3.5 pb-3.5 space-y-3 animate-fade-in" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="pt-3">
                  <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--text-tertiary)' }}>Source mode</label>
                  <div className="flex flex-wrap gap-1.5">
                    {modes.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setSourceMode(p.id, m.value)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                        style={{
                          background: currentMode === m.value ? 'var(--accent)' : 'var(--bg-overlay)',
                          color: currentMode === m.value ? 'white' : 'var(--text-secondary)',
                          border: `1px solid ${currentMode === m.value ? 'var(--accent)' : 'var(--border-default)'}`,
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {p.supportsCookies && (
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Manual cookie</label>
                    <textarea
                      value={getManualCookie(p.id)}
                      onChange={(e) => setManualCookie(p.id, e.target.value)}
                      placeholder="Paste cookie header value..."
                      rows={2}
                      className="cb-input w-full resize-none font-mono text-xs"
                    />
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Only needed if auto extraction fails.</p>
                  </div>
                )}

                {p.id === "copilot" && (
                  <button onClick={() => setCopilotDialogOpen(true)} className="cb-btn w-full">
                    Sign in with GitHub
                  </button>
                )}

                {p.supportsCli && p.id !== "copilot" && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {p.id === "claude" && "Run `claude login` in terminal to authenticate"}
                    {p.id === "codex" && "Run `codex login` in terminal to authenticate"}
                    {p.id === "gemini" && "Run `gemini auth login` in terminal to authenticate"}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <CopilotLoginDialog open={copilotDialogOpen} onClose={() => setCopilotDialogOpen(false)} onSuccess={() => setCopilotDialogOpen(false)} />
    </div>
  );
}

/* ========= Display Tab ========= */
function DisplayTab({ settings, onUpdate }: { settings: SettingsType; onUpdate: (s: SettingsType) => void }) {
  return (
    <div className="space-y-1">
      <SettingRow label="Theme" desc="App appearance">
        <select
          value={settings.theme}
          onChange={(e) => onUpdate({ ...settings, theme: e.target.value })}
          className="cb-input text-sm"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </SettingRow>

      <SettingRow label="Show usage as" desc="How to display percentages">
        <select
          value={settings.showAsUsed ? "used" : "remaining"}
          onChange={(e) => onUpdate({ ...settings, showAsUsed: e.target.value === "used" })}
          className="cb-input text-sm"
        >
          <option value="remaining">Remaining</option>
          <option value="used">Used</option>
        </select>
      </SettingRow>

      <SettingRow label="Reset time" desc="How to show countdown">
        <select
          value={settings.resetTimeFormat}
          onChange={(e) => onUpdate({ ...settings, resetTimeFormat: e.target.value })}
          className="cb-input text-sm"
        >
          <option value="relative">Relative</option>
          <option value="absolute">Absolute</option>
        </select>
      </SettingRow>

      <SettingRow label="Animations" desc="Tray icon transitions">
        <Toggle checked={settings.animationsEnabled} onChange={(v) => onUpdate({ ...settings, animationsEnabled: v })} />
      </SettingRow>

      <SettingRow label="Privacy mode" desc="Hide emails and org names">
        <Toggle checked={settings.privacyMode} onChange={(v) => onUpdate({ ...settings, privacyMode: v })} />
      </SettingRow>
    </div>
  );
}

/* ========= About Tab ========= */
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
      navigator.clipboard.writeText(diag);
      setDiagCopied(true);
      setTimeout(() => setDiagCopied(false), 2000);
    } catch (err) {
      console.error("Failed to export diagnostics:", err);
    }
  };

  return (
    <div className="flex flex-col items-center py-8 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #4263eb, #7048e8)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-6" />
        </svg>
      </div>
      <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>CodexBar for Windows</div>
      <div className="text-xs font-mono mb-4" style={{ color: 'var(--text-muted)' }}>v0.2.0</div>
      <p className="text-sm max-w-[280px] mb-5" style={{ color: 'var(--text-tertiary)' }}>
        Monitor your AI coding assistant usage quotas from the system tray.
      </p>

      <div className="flex gap-3 mb-5">
        <a href="#" onClick={(e) => { e.preventDefault(); openUrl("https://github.com/HarshalJain-cs/CodexBar-windows"); }} className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          GitHub
        </a>
        <span style={{ color: 'var(--text-muted)' }}>&middot;</span>
        <a href="#" onClick={(e) => { e.preventDefault(); openUrl("https://github.com/steipete/CodexBar"); }} className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Based on CodexBar
        </a>
      </div>

      <div className="flex flex-col gap-2.5 w-full max-w-[220px]">
        <button onClick={handleCheckUpdates} disabled={checking} className="cb-btn w-full justify-center text-sm">
          {checking ? "Checking..." : "Check for Updates"}
        </button>
        {updateStatus && <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{updateStatus}</div>}

        <button onClick={handleExportDiagnostics} className="cb-btn w-full justify-center text-sm">
          {diagCopied ? "Copied!" : "Export Diagnostics"}
        </button>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Copies redacted info for troubleshooting</p>
      </div>

      <div className="text-xs mt-5" style={{ color: 'var(--text-muted)' }}>MIT License</div>
    </div>
  );
}

/* ========= Shared Components ========= */
function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5 px-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
        {desc && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="cb-toggle"
    >
      <span className="cb-toggle-knob" />
    </button>
  );
}
