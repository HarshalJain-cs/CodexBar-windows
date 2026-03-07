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
  soundEnabled: boolean;
  updateChannel: string;
  providerRefreshIntervals: Record<string, number>;
  theme: string;
}

/** Provider metadata from get_available_providers */
export interface ProviderInfo {
  id: string;
  name: string;
  dashboardUrl: string;
  hasStatusPage: boolean;
  supportsOauth: boolean;
  supportsCookies: boolean;
  supportsCli: boolean;
  supportsApiKey: boolean;
}

/** Copilot device flow response */
export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

/** Usage trend data from history tracking */
export interface UsageTrend {
  providerId: string;
  trend: "rising" | "falling" | "steady" | null;
  points: { timestamp: string; usedPercent: number }[];
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

/** Calculate usage pacing - returns pace ratio and direction arrow */
export function getPacing(window: RateWindow): { pace: number; arrow: string; label: string } | null {
  if (!window.resetsAt || !window.windowMinutes) return null;

  const now = new Date();
  const resetAt = new Date(window.resetsAt);
  if (resetAt <= now) return null;

  const windowMs = window.windowMinutes * 60 * 1000;
  const remainingMs = resetAt.getTime() - now.getTime();
  const elapsedMs = windowMs - remainingMs;
  if (elapsedMs <= 0 || windowMs <= 0) return null;

  const timeElapsedPct = (elapsedMs / windowMs) * 100;
  if (timeElapsedPct <= 0) return null;

  const pace = window.usedPercent / timeElapsedPct;

  if (pace > 1.10) return { pace, arrow: "\u2191", label: "Well ahead" };
  if (pace > 1.05) return { pace, arrow: "\u2197", label: "Slightly ahead" };
  if (pace > 0.95) return { pace, arrow: "\u2192", label: "On track" };
  if (pace > 0.90) return { pace, arrow: "\u2198", label: "Slightly behind" };
  return { pace, arrow: "\u2193", label: "Well behind" };
}
