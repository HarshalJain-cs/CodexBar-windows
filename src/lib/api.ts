import type {
  DeviceCodeResponse,
  ProviderInfo,
  ProviderStatus,
  ProviderUsage,
  Settings,
  UsageTrend,
} from "./types";
import {
  isTauri,
  mockProviders,
  mockStatuses,
  mockTrends,
  mockSettings,
  mockProviderInfos,
} from "./mockData";

// In-memory settings for browser preview mode
let browserSettings = { ...mockSettings };

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function getAllUsage(): Promise<ProviderUsage[]> {
  if (!isTauri()) return mockProviders;
  return invoke<ProviderUsage[]>("get_all_usage");
}

export async function refreshProvider(providerId: string): Promise<ProviderUsage> {
  if (!isTauri()) return mockProviders.find((p) => p.providerId === providerId) || mockProviders[0];
  return invoke<ProviderUsage>("refresh_provider", { providerId });
}

export async function refreshAll(): Promise<ProviderUsage[]> {
  if (!isTauri()) return mockProviders;
  return invoke<ProviderUsage[]>("refresh_all");
}

export async function getSettings(): Promise<Settings> {
  if (!isTauri()) return browserSettings;
  return invoke<Settings>("get_settings");
}

export async function updateSettings(settings: Settings): Promise<void> {
  if (!isTauri()) {
    browserSettings = { ...settings };
    return;
  }
  return invoke<void>("update_settings", { settings });
}

export async function getProviderStatus(): Promise<ProviderStatus[]> {
  if (!isTauri()) return Object.values(mockStatuses);
  return invoke<ProviderStatus[]>("get_provider_status");
}

export async function getAvailableProviders(): Promise<ProviderInfo[]> {
  if (!isTauri()) return mockProviderInfos;
  return invoke<ProviderInfo[]>("get_available_providers");
}

export async function openUrl(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank");
    return;
  }
  return invoke<void>("open_url", { url });
}

export async function startCopilotDeviceFlow(): Promise<DeviceCodeResponse> {
  if (!isTauri()) {
    return {
      deviceCode: "mock-device-code",
      userCode: "ABCD-1234",
      verificationUri: "https://github.com/login/device",
      expiresIn: 900,
      interval: 5,
    };
  }
  return invoke<DeviceCodeResponse>("start_copilot_device_flow");
}

export async function pollCopilotDeviceFlow(
  deviceCode: string,
): Promise<string | null> {
  if (!isTauri()) return null;
  return invoke<string | null>("poll_copilot_device_flow", { deviceCode });
}

export async function checkForUpdates(): Promise<string | null> {
  if (!isTauri()) return "Up to date (browser preview)";
  return invoke<string | null>("check_for_updates");
}

export async function setAutostart(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("set_autostart", { enabled });
}

export async function getAutostart(): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>("get_autostart");
}

export async function exportDiagnostics(): Promise<string> {
  if (!isTauri()) return JSON.stringify({ preview: true, message: "Browser preview mode" }, null, 2);
  return invoke<string>("export_diagnostics");
}

export async function getUsageTrends(): Promise<UsageTrend[]> {
  if (!isTauri()) return Object.values(mockTrends);
  return invoke<UsageTrend[]>("get_usage_trends");
}
