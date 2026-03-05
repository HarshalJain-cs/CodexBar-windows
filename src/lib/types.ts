/** Matches Rust RateWindow */
export interface RateWindow {
  usedPercent: number;
  windowMinutes?: number;
  resetsAt?: string;
  resetDescription?: string;
}

/** Matches Rust UsageSnapshot */
export interface UsageSnapshot {
  primary: RateWindow;
  secondary?: RateWindow;
  modelSpecific?: RateWindow;
  accountEmail?: string;
  accountOrg?: string;
  accountPlan?: string;
  sourceLabel: string;
  updatedAt: string;
}

/** Matches Rust CostSnapshot */
export interface CostSnapshot {
  totalCostUsd?: number;
  creditsRemaining?: number;
  creditsTotal?: number;
}

/** Matches Rust ProviderFetchResult */
export interface ProviderUsage {
  providerId: string;
  providerName: string;
  usage?: UsageSnapshot;
  cost?: CostSnapshot;
  error?: string;
  isStale: boolean;
}

/** Matches Rust ProviderStatus */
export interface ProviderStatus {
  providerId: string;
  level: "operational" | "degradedPerformance" | "partialOutage" | "majorOutage" | "unknown";
  description: string;
}

/** Matches Rust Settings */
export interface Settings {
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
}

/** Provider metadata from get_available_providers */
export interface ProviderInfo {
  id: string;
  name: string;
  dashboardUrl: string;
  hasStatusPage: boolean;
}

/** Copilot device flow response */
export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

/** Usage level for color coding */
export type UsageLevel = "low" | "medium" | "high" | "critical";

export function getUsageLevel(percent: number): UsageLevel {
  if (percent >= 95) return "critical";
  if (percent >= 80) return "high";
  if (percent >= 50) return "medium";
  return "low";
}

export function getRemainingPercent(window: RateWindow): number {
  return Math.max(0, 100 - window.usedPercent);
}
