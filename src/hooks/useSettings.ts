import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppSettings, ProviderId } from '@/types';
import { defaultSettings } from '@/data/mockData';

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
    privacyMode: existing?.privacyMode ?? false,
    soundEnabled: frontend.soundEnabled,
    updateChannel: existing?.updateChannel ?? 'stable',
    providerRefreshIntervals: existing?.providerRefreshIntervals ?? {},
    theme: frontend.theme,
    viewMode: frontend.viewMode,
    providerOrder: frontend.providerOrder,
    notificationType: frontend.notificationType,
    notificationSound: frontend.notificationSound,
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
        const imported = JSON.parse(e.target?.result as string) as AppSettings;
        const merged = { ...settings, ...imported };
        setSettings(merged);
        const backendData = frontendToBackend(merged, backendSettings ?? undefined);
        invoke('update_settings', { settings: backendData })
          .then(() => setBackendSettings(backendData))
          .catch(err => console.error('Failed to import settings:', err));
      } catch {
        console.error('Invalid settings file');
      }
    };
    reader.readAsText(file);
  }, [settings, backendSettings]);

  return { settings, updateSettings, resetSettings, exportSettings, importSettings };
}
