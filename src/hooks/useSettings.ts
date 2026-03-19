import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppSettings, ProviderId } from '@/types';
import { defaultSettings } from '@/data/mockData';
import { z } from 'zod';
import { toast } from 'sonner';

// Zod schema for validating imported settings
const appSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  refreshInterval: z.number().min(10).max(120).optional(),
  animationsEnabled: z.boolean().optional(),
  notificationType: z.enum(['system', 'in-app', 'both']).optional(),
  notificationSound: z.enum(['default', 'custom', 'none']).optional(),
  soundEnabled: z.boolean().optional(),
  warningThreshold: z.number().min(5).max(50).optional(),
  criticalThreshold: z.number().min(5).max(25).optional(),
  launchAtStartup: z.boolean().optional(),
  globalShortcut: z.string().optional(),
  viewMode: z.enum(['grid', 'compact']).optional(),
  providerOrder: z.array(z.string()).optional(),
  enabledProviders: z.array(z.string()).optional(),
  privacyMode: z.boolean().optional(),
  pinnedProviders: z.array(z.string()).optional(),
  providerThresholds: z.record(z.object({
    warning: z.number(),
    critical: z.number(),
  })).optional(),
  accentColor: z.string().optional(),
  focusMode: z.boolean().optional(),
  dataRetentionDays: z.number().min(1).max(365).optional(),
}).passthrough();

// Backend Settings shape (mirrors Rust serde output)
interface BackendSettings {
  enabledProviders: string[];
  refreshIntervalSecs: number;
  providerSources: Record<string, string>;
  manualCookies: Record<string, string>;
  apiKeys: Record<string, string>;
  showAsUsed: boolean;
  resetTimeFormat: string;
  notificationsEnabled: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  startAtLogin: boolean;
  globalShortcut: string;
  animationsEnabled: boolean;
  privacyMode: boolean;
  soundEnabled: boolean;
  updateChannel: string;
  providerRefreshIntervals: Record<string, number>;
  theme: string;
  // New fields added for companion frontend
  viewMode?: string;
  providerOrder?: string[];
  notificationType?: string;
  notificationSound?: string;
  pinnedProviders?: string[];
  providerThresholds?: Record<string, { warning: number; critical: number }>;
  accentColor?: string;
  focusMode?: boolean;
  dataRetentionDays?: number;
}

function backendToFrontend(backend: BackendSettings): AppSettings {
  return {
    theme: (backend.theme as AppSettings['theme']) || 'dark',
    refreshInterval: backend.refreshIntervalSecs || 30,
    animationsEnabled: backend.animationsEnabled ?? true,
    notificationType: (backend.notificationType as AppSettings['notificationType']) || 'both',
    notificationSound: (backend.notificationSound as AppSettings['notificationSound']) || 'default',
    soundEnabled: backend.soundEnabled ?? true,
    warningThreshold: backend.warningThreshold ?? 30,
    criticalThreshold: backend.criticalThreshold ?? 10,
    launchAtStartup: backend.startAtLogin ?? false,
    globalShortcut: backend.globalShortcut || 'Ctrl+Shift+U',
    viewMode: (backend.viewMode as AppSettings['viewMode']) || 'grid',
    providerOrder: (backend.providerOrder as ProviderId[]) || defaultSettings.providerOrder,
    enabledProviders: (backend.enabledProviders as ProviderId[]) || defaultSettings.enabledProviders,
    privacyMode: backend.privacyMode ?? false,
    pinnedProviders: (backend.pinnedProviders as ProviderId[]) || [],
    providerThresholds: (backend.providerThresholds as AppSettings['providerThresholds']) || {},
    accentColor: backend.accentColor || '217 91% 60%',
    focusMode: backend.focusMode ?? false,
    dataRetentionDays: backend.dataRetentionDays ?? 30,
  };
}

function frontendToBackend(frontend: AppSettings, existing?: BackendSettings): BackendSettings {
  return {
    enabledProviders: frontend.enabledProviders,
    refreshIntervalSecs: frontend.refreshInterval,
    providerSources: existing?.providerSources ?? {},
    manualCookies: existing?.manualCookies ?? {},
    apiKeys: existing?.apiKeys ?? {},
    showAsUsed: existing?.showAsUsed ?? false,
    resetTimeFormat: existing?.resetTimeFormat ?? 'relative',
    notificationsEnabled: frontend.notificationType !== 'system',
    warningThreshold: frontend.warningThreshold,
    criticalThreshold: frontend.criticalThreshold,
    startAtLogin: frontend.launchAtStartup,
    globalShortcut: frontend.globalShortcut,
    animationsEnabled: frontend.animationsEnabled,
    privacyMode: frontend.privacyMode,
    soundEnabled: frontend.soundEnabled,
    updateChannel: existing?.updateChannel ?? 'stable',
    providerRefreshIntervals: existing?.providerRefreshIntervals ?? {},
    theme: frontend.theme,
    viewMode: frontend.viewMode,
    providerOrder: frontend.providerOrder,
    notificationType: frontend.notificationType,
    notificationSound: frontend.notificationSound,
    pinnedProviders: frontend.pinnedProviders,
    providerThresholds: frontend.providerThresholds,
    accentColor: frontend.accentColor,
    focusMode: frontend.focusMode,
    dataRetentionDays: frontend.dataRetentionDays,
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [backendSettings, setBackendSettings] = useState<BackendSettings | null>(null);

  // Load settings from backend on mount
  useEffect(() => {
    invoke<BackendSettings>('get_settings')
      .then(backend => {
        setBackendSettings(backend);
        setSettings(backendToFrontend(backend));
      })
      .catch(err => {
        console.error('Failed to load settings:', err);
        // Keep defaults
      });
  }, []);

  // Sync autostart plugin on mount and when launchAtStartup changes
  useEffect(() => {
    (async () => {
      try {
        const { isEnabled, enable, disable } = await import('@tauri-apps/plugin-autostart');
        const currentlyEnabled = await isEnabled();
        if (settings.launchAtStartup && !currentlyEnabled) {
          await enable();
        } else if (!settings.launchAtStartup && currentlyEnabled) {
          await disable();
        }
      } catch {
        // Not running inside Tauri or plugin not available — skip
      }
    })();
  }, [settings.launchAtStartup]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      // Save to backend asynchronously
      const backendData = frontendToBackend(next, backendSettings ?? undefined);
      invoke('update_settings', { settings: backendData })
        .then(() => setBackendSettings(backendData))
        .catch(err => console.error('Failed to save settings:', err));
      return next;
    });
  }, [backendSettings]);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    const backendData = frontendToBackend(defaultSettings, backendSettings ?? undefined);
    invoke('update_settings', { settings: backendData })
      .then(() => setBackendSettings(backendData))
      .catch(err => console.error('Failed to reset settings:', err));
  }, [backendSettings]);

  const exportSettings = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codexbar-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const importSettings = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        const result = appSettingsSchema.safeParse(raw);
        if (!result.success) {
          const firstError = result.error.errors[0];
          toast.error(`Invalid settings file: ${firstError.path.join('.')}: ${firstError.message}`);
          return;
        }
        const imported = result.data as Partial<AppSettings>;
        const merged = { ...settings, ...imported };
        setSettings(merged as AppSettings);
        const backendData = frontendToBackend(merged as AppSettings, backendSettings ?? undefined);
        invoke('update_settings', { settings: backendData })
          .then(() => setBackendSettings(backendData))
          .catch(err => console.error('Failed to import settings:', err));
      } catch {
        toast.error('Invalid settings file: could not parse JSON');
      }
    };
    reader.readAsText(file);
  }, [settings, backendSettings]);

  return { settings, updateSettings, resetSettings, exportSettings, importSettings };
}

