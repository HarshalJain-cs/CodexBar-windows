import { invoke } from "@tauri-apps/api/core";
import type {
  DeviceCodeResponse,
  ProviderInfo,
  ProviderStatus,
  ProviderUsage,
  Settings,
  UsageTrend,
} from "./types";

export async function getAllUsage(): Promise<ProviderUsage[]> {
  return invoke<ProviderUsage[]>("get_all_usage");
}

export async function refreshProvider(providerId: string): Promise<ProviderUsage> {
  return invoke<ProviderUsage>("refresh_provider", { providerId });
}

export async function refreshAll(): Promise<ProviderUsage[]> {
  return invoke<ProviderUsage[]>("refresh_all");
}

export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

export async function updateSettings(settings: Settings): Promise<void> {
  return invoke<void>("update_settings", { settings });
}

export async function getProviderStatus(): Promise<ProviderStatus[]> {
  return invoke<ProviderStatus[]>("get_provider_status");
}

export async function getAvailableProviders(): Promise<ProviderInfo[]> {
  return invoke<ProviderInfo[]>("get_available_providers");
}

export async function openUrl(url: string): Promise<void> {
  return invoke<void>("open_url", { url });
}

export async function startCopilotDeviceFlow(): Promise<DeviceCodeResponse> {
  return invoke<DeviceCodeResponse>("start_copilot_device_flow");
}

export async function pollCopilotDeviceFlow(
  deviceCode: string,
): Promise<string | null> {
  return invoke<string | null>("poll_copilot_device_flow", { deviceCode });
}

export async function checkForUpdates(): Promise<string | null> {
  return invoke<string | null>("check_for_updates");
}

export async function setAutostart(enabled: boolean): Promise<void> {
  return invoke<void>("set_autostart", { enabled });
}

export async function getAutostart(): Promise<boolean> {
  return invoke<boolean>("get_autostart");
}

export async function exportDiagnostics(): Promise<string> {
  return invoke<string>("export_diagnostics");
}

export async function getUsageTrends(): Promise<UsageTrend[]> {
  return invoke<UsageTrend[]>("get_usage_trends");
}
