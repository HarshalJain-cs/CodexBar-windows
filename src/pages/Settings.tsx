import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { getAvailableProviders } from "@/lib/api";
import type { ProviderInfo, Settings as SettingsType } from "@/lib/types";

interface SettingsProps {
  onBack: () => void;
}

type Tab = "general" | "providers" | "display" | "about";

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

function ProvidersTab({
  settings,
  providers,
  onToggle,
}: {
  settings: SettingsType;
  providers: ProviderInfo[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {providers.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50"
        >
          <div>
            <div className="text-xs font-medium text-zinc-200">{p.name}</div>
            <div className="text-[10px] text-zinc-500">{p.id}</div>
          </div>
          <Toggle
            checked={settings.enabledProviders.includes(p.id)}
            onChange={() => onToggle(p.id)}
          />
        </div>
      ))}
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
  return (
    <div className="space-y-3 text-center py-6">
      <div className="text-3xl">📊</div>
      <div>
        <div className="text-sm font-semibold">CodexBar for Windows</div>
        <div className="text-[10px] text-zinc-500 font-mono">v0.1.0</div>
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
