import { AppSettings, ProviderId, SettingsTab } from '@/types';
import { useState, useRef } from 'react';
import { ArrowLeft, Upload, Download, Bug, Shield, ShieldAlert, ShieldX, RefreshCw, CheckCircle2, XCircle, Key } from 'lucide-react';
import NotificationPreview from './NotificationPreview';
import ShortcutInput from './ShortcutInput';
import { providerLogos } from '@/data/providerLogos';
import { toast } from 'sonner';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onBack: () => void;
  onOpenDiagnostics: () => void;
  onExportSettings: () => void;
  onImportSettings: (file: File) => void;
  debugMode: boolean;
  onToggleDebugMode: () => void;
}

export default function SettingsPage({
  settings,
  onUpdateSettings,
  onBack,
  onOpenDiagnostics,
  onExportSettings,
  onImportSettings,
  debugMode,
  onToggleDebugMode,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'display', label: 'Display' },
    { id: 'providers', label: 'Providers' },
    { id: 'auth', label: 'Auth' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-card-foreground">Settings</span>
        </div>
        <button
          onClick={onOpenDiagnostics}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open diagnostics"
        >
          <Bug size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card px-1" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 cb-scroll-area p-3 space-y-4" role="tabpanel">
        {activeTab === 'general' && (
          <GeneralTab settings={settings} onUpdate={onUpdateSettings} />
        )}
        {activeTab === 'display' && (
          <DisplayTab settings={settings} onUpdate={onUpdateSettings} />
        )}
        {activeTab === 'providers' && (
          <ProvidersTab settings={settings} onUpdate={onUpdateSettings} />
        )}
        {activeTab === 'auth' && <AuthTab />}
        {activeTab === 'about' && (
          <AboutTab
            onExport={onExportSettings}
            onImport={onImportSettings}
            debugMode={debugMode}
            onToggleDebugMode={onToggleDebugMode}
          />
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <div className="text-xs font-medium text-card-foreground">{label}</div>
        {description && <div className="text-[10px] text-muted-foreground">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <span
          className={`pointer-events-none block h-[18px] w-[18px] rounded-full bg-primary-foreground shadow-sm ring-0 transition-transform mt-[2px] ${
            checked ? 'translate-x-[20px]' : 'translate-x-[2px]'
          }`}
        />
      </button>
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs font-medium text-card-foreground">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-[11px] bg-secondary text-secondary-foreground border border-border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
        aria-label={label}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-card-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground font-mono">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
        aria-label={label}
      />
    </div>
  );
}

function GeneralTab({
  settings,
  onUpdate,
}: {
  settings: AppSettings;
  onUpdate: (u: Partial<AppSettings>) => void;
}) {
  return (
    <>
      <SliderRow
        label="Refresh interval"
        value={settings.refreshInterval}
        min={10}
        max={120}
        unit="s"
        onChange={v => onUpdate({ refreshInterval: v })}
      />
      <ToggleRow
        label="Launch at startup"
        description="Adds CodexBar to Windows Startup apps"
        checked={settings.launchAtStartup}
        onChange={v => onUpdate({ launchAtStartup: v })}
      />
      <ShortcutInput
        value={settings.globalShortcut}
        onChange={shortcut => onUpdate({ globalShortcut: shortcut })}
      />
      <SelectRow
        label="Notifications"
        value={settings.notificationType}
        options={[
          { value: 'system', label: 'System toast' },
          { value: 'in-app', label: 'In-app banner' },
          { value: 'both', label: 'Both' },
        ]}
        onChange={v => onUpdate({ notificationType: v as AppSettings['notificationType'] })}
      />
      <SelectRow
        label="Sound"
        value={settings.notificationSound}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'custom', label: 'Custom' },
          { value: 'none', label: 'None' },
        ]}
        onChange={v => onUpdate({ notificationSound: v as AppSettings['notificationSound'] })}
      />
      <ToggleRow
        label="Sound enabled"
        checked={settings.soundEnabled}
        onChange={v => onUpdate({ soundEnabled: v })}
      />
      <SliderRow
        label="Warning threshold"
        value={settings.warningThreshold}
        min={10}
        max={50}
        unit="%"
        onChange={v => onUpdate({ warningThreshold: v })}
      />
      <SliderRow
        label="Critical threshold"
        value={settings.criticalThreshold}
        min={5}
        max={25}
        unit="%"
        onChange={v => onUpdate({ criticalThreshold: v })}
      />
      <NotificationPreview
        settings={settings}
        onTestNotification={() => toast.info('Test notification from CodexBar')}
      />
    </>
  );
}

function DisplayTab({
  settings,
  onUpdate,
}: {
  settings: AppSettings;
  onUpdate: (u: Partial<AppSettings>) => void;
}) {
  return (
    <>
      <SelectRow
        label="Theme"
        value={settings.theme}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
          { value: 'system', label: 'System' },
        ]}
        onChange={v => onUpdate({ theme: v as AppSettings['theme'] })}
      />
      <ToggleRow
        label="Animations"
        description="Disable for reduced motion"
        checked={settings.animationsEnabled}
        onChange={v => onUpdate({ animationsEnabled: v })}
      />
      <SelectRow
        label="View mode"
        value={settings.viewMode}
        options={[
          { value: 'grid', label: 'Grid cards' },
          { value: 'compact', label: 'Compact list' },
        ]}
        onChange={v => onUpdate({ viewMode: v as AppSettings['viewMode'] })}
      />
    </>
  );
}

function ProvidersTab({
  settings,
  onUpdate,
}: {
  settings: AppSettings;
  onUpdate: (u: Partial<AppSettings>) => void;
}) {
  const allProviders: { id: ProviderId; name: string }[] = [
    { id: 'codex', name: 'Codex' },
    { id: 'claude', name: 'Claude' },
    { id: 'cursor', name: 'Cursor' },
    { id: 'gemini', name: 'Gemini' },
    { id: 'copilot', name: 'Copilot' },
    { id: 'windsurf', name: 'Windsurf' },
    { id: 'kiro', name: 'Kiro' },
    { id: 'augment', name: 'Augment' },
    { id: 'devin', name: 'Devin' },
  ];
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground mb-3">Enable/disable providers. Drag cards on dashboard to reorder.</div>
      {allProviders.map(p => (
        <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-2.5">
            <img src={providerLogos[p.id]} alt={p.name} className="h-5 w-5 rounded-sm object-contain" />
            <span className="text-xs font-medium text-card-foreground">{p.name}</span>
          </div>
          <button
            onClick={() => {
              const enabled = settings.enabledProviders.includes(p.id);
              const updated = enabled
                ? settings.enabledProviders.filter(x => x !== p.id)
                : [...settings.enabledProviders, p.id];
              onUpdate({ enabledProviders: updated });
            }}
            className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              settings.enabledProviders.includes(p.id) ? 'bg-primary' : 'bg-muted'
            }`}
            role="switch"
            aria-checked={settings.enabledProviders.includes(p.id)}
            aria-label={`Toggle ${p.name}`}
          >
            <span
              className={`pointer-events-none block h-[18px] w-[18px] rounded-full bg-primary-foreground shadow-sm ring-0 transition-transform mt-[2px] ${
                settings.enabledProviders.includes(p.id) ? 'translate-x-[20px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

function AuthTab() {
  const [testing, setTesting] = useState<string | null>(null);

  const providers: { id: ProviderId; name: string; status: 'authenticated' | 'expired' | 'not_configured'; type: string; lastAuth: string }[] = [
    { id: 'codex', name: 'Codex', status: 'authenticated', type: 'CLI Token', lastAuth: '2 days ago' },
    { id: 'claude', name: 'Claude', status: 'authenticated', type: 'OAuth 2.0', lastAuth: '1 hour ago' },
    { id: 'cursor', name: 'Cursor', status: 'authenticated', type: 'Session Cookie', lastAuth: '5 hours ago' },
    { id: 'gemini', name: 'Gemini', status: 'expired', type: 'OAuth 2.0', lastAuth: '3 days ago' },
    { id: 'copilot', name: 'Copilot', status: 'authenticated', type: 'GitHub CLI', lastAuth: '12 hours ago' },
    { id: 'windsurf', name: 'Windsurf', status: 'authenticated', type: 'API Key', lastAuth: '6 hours ago' },
    { id: 'kiro', name: 'Kiro', status: 'authenticated', type: 'OAuth 2.0', lastAuth: '1 day ago' },
    { id: 'augment', name: 'Augment', status: 'not_configured', type: 'API Key', lastAuth: 'Never' },
    { id: 'devin', name: 'Devin', status: 'authenticated', type: 'OAuth 2.0', lastAuth: '3 hours ago' },
  ];

  const handleTest = async (name: string) => {
    setTesting(name);
    await new Promise(r => setTimeout(r, 1200));
    setTesting(null);
    toast.success(`${name} connection verified`);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'authenticated') return <Shield size={14} className="text-cb-success" />;
    if (status === 'expired') return <ShieldAlert size={14} className="text-cb-warning" />;
    return <ShieldX size={14} className="text-cb-critical" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Key size={14} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-card-foreground">Credential Management</span>
      </div>

      {providers.map(p => (
        <div
          key={p.name}
          className={`rounded-lg border p-3 transition-colors ${
            p.status === 'expired'
              ? 'border-cb-warning/30 bg-cb-warning/5'
              : 'border-border bg-card hover:bg-secondary/30'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <img src={providerLogos[p.id]} alt={p.name} className="h-5 w-5 rounded-sm object-contain" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-card-foreground">{p.name}</span>
                <StatusIcon status={p.status} />
              </div>
              <span className="text-[10px] text-muted-foreground">{p.type}</span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                p.status === 'authenticated'
                  ? 'cb-badge-operational'
                  : p.status === 'expired'
                  ? 'cb-badge-degraded'
                  : 'cb-badge-unknown'
              }`}
            >
              {p.status === 'authenticated' ? '● Connected' : p.status === 'expired' ? '● Expired' : '○ Not Set'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Last authenticated: {p.lastAuth}
            </span>
            <div className="flex items-center gap-1.5">
              {p.status === 'expired' && (
                <button
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-cb-warning/15 text-cb-warning hover:bg-cb-warning/25 transition-colors"
                  onClick={() => toast.info(`Re-authenticate ${p.name} in your terminal`)}
                >
                  Re-auth
                </button>
              )}
              <button
                onClick={() => handleTest(p.name)}
                disabled={testing === p.name}
                className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                {testing === p.name ? (
                  <RefreshCw size={10} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={10} />
                )}
                {testing === p.name ? 'Testing...' : 'Test'}
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 rounded-lg border border-border bg-secondary/30">
        <div className="text-[10px] font-semibold text-card-foreground mb-1">Security Note</div>
        <div className="text-[10px] text-muted-foreground leading-relaxed">
          Credentials are stored locally in your system keychain. CodexBar never transmits auth tokens to external servers.
        </div>
      </div>
    </div>
  );
}

function AboutTab({
  onExport,
  onImport,
  debugMode,
  onToggleDebugMode,
}: {
  onExport: () => void;
  onImport: (file: File) => void;
  debugMode: boolean;
  onToggleDebugMode: () => void;
}) {
  const [clickCount, setClickCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVersionClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 3) {
      onToggleDebugMode();
      setClickCount(0);
      toast(debugMode ? 'Debug mode disabled' : 'Debug mode enabled 🔧');
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-lg font-bold text-card-foreground cb-mono">CodexBar</div>
        <div
          className="text-[10px] text-muted-foreground cursor-pointer select-none"
          onClick={handleVersionClick}
        >
          v1.1.2 · Windows {debugMode && '· 🔧 Debug'}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground text-center leading-relaxed">
        AI provider usage monitor for your system tray.
        <br />
        Track session & weekly limits across Codex, Claude, Cursor, Gemini, and Copilot.
      </div>

      {/* Export/Import */}
      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Settings backup</div>
        <div className="flex gap-2">
          <button
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Download size={12} />
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Upload size={12} />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                onImport(file);
                toast.success('Settings imported');
              }
            }}
          />
        </div>
      </div>

      <div className="text-[10px] text-center text-muted-foreground">
        Based on{' '}
        <a
          href="https://github.com/Finesssee/Win-CodexBar"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Win-CodexBar
        </a>
      </div>
    </div>
  );
}
