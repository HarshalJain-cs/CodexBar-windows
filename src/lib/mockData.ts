import type {
  ProviderUsage,
  ProviderStatus,
  ProviderInfo,
  Settings,
  UsageTrend,
} from "./types";

/** Check if we're running inside Tauri */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const futureDate = (hoursFromNow: number) =>
  new Date(Date.now() + hoursFromNow * 3600_000).toISOString();

export const mockProviders: ProviderUsage[] = [
  {
    providerId: "claude",
    providerName: "Claude",
    usage: {
      primary: {
        usedPercent: 42,
        windowMinutes: 300,
        resetsAt: futureDate(2.8),
        resetDescription: "Session resets in ~3h",
      },
      secondary: {
        usedPercent: 18,
        windowMinutes: 10080,
        resetsAt: futureDate(96),
        resetDescription: "Weekly reset Mon 00:00",
      },
      accountEmail: "dev@example.com",
      accountPlan: "Max",
      sourceLabel: "OAuth",
      updatedAt: new Date().toISOString(),
    },
    isStale: false,
  },
  {
    providerId: "codex",
    providerName: "Codex",
    usage: {
      primary: {
        usedPercent: 87,
        windowMinutes: 180,
        resetsAt: futureDate(0.5),
        resetDescription: "Session resets soon",
      },
      accountEmail: "dev@example.com",
      accountPlan: "Pro",
      sourceLabel: "OAuth",
      updatedAt: new Date().toISOString(),
    },
    isStale: false,
  },
  {
    providerId: "cursor",
    providerName: "Cursor",
    usage: {
      primary: {
        usedPercent: 65,
        windowMinutes: 1440,
        resetsAt: futureDate(12),
        resetDescription: "Daily reset at midnight",
      },
      secondary: {
        usedPercent: 30,
        windowMinutes: 43200,
        resetsAt: futureDate(480),
        resetDescription: "Monthly reset",
      },
      modelSpecific: {
        usedPercent: 91,
        windowMinutes: 1440,
      },
      accountEmail: "user@company.com",
      accountOrg: "My Team",
      accountPlan: "Business",
      sourceLabel: "Web",
      updatedAt: new Date().toISOString(),
    },
    isStale: false,
  },
  {
    providerId: "gemini",
    providerName: "Gemini",
    usage: {
      primary: {
        usedPercent: 12,
        windowMinutes: 1440,
        resetsAt: futureDate(18),
        resetDescription: "Connected",
      },
      accountPlan: "Gemini",
      sourceLabel: "OAuth",
      updatedAt: new Date().toISOString(),
    },
    isStale: false,
  },
  {
    providerId: "copilot",
    providerName: "GitHub Copilot",
    error: "Not authenticated. Sign in via Settings > Auth.",
    isStale: true,
  },
];

export const mockStatuses: Record<string, ProviderStatus> = {
  claude: {
    providerId: "claude",
    level: "operational",
    description: "All Systems Operational",
  },
  codex: {
    providerId: "codex",
    level: "degradedPerformance",
    description: "Elevated API latency",
  },
  cursor: {
    providerId: "cursor",
    level: "operational",
    description: "All Systems Operational",
  },
  gemini: {
    providerId: "gemini",
    level: "operational",
    description: "All Systems Operational",
  },
  copilot: {
    providerId: "copilot",
    level: "operational",
    description: "All Systems Operational",
  },
};

export const mockTrends: Record<string, UsageTrend> = {
  claude: {
    providerId: "claude",
    trend: "rising",
    points: [
      { timestamp: new Date(Date.now() - 1800_000).toISOString(), usedPercent: 35 },
      { timestamp: new Date(Date.now() - 1200_000).toISOString(), usedPercent: 38 },
      { timestamp: new Date(Date.now() - 600_000).toISOString(), usedPercent: 40 },
      { timestamp: new Date().toISOString(), usedPercent: 42 },
    ],
  },
  codex: {
    providerId: "codex",
    trend: "steady",
    points: [
      { timestamp: new Date(Date.now() - 600_000).toISOString(), usedPercent: 86 },
      { timestamp: new Date().toISOString(), usedPercent: 87 },
    ],
  },
  cursor: {
    providerId: "cursor",
    trend: "falling",
    points: [
      { timestamp: new Date(Date.now() - 1200_000).toISOString(), usedPercent: 72 },
      { timestamp: new Date(Date.now() - 600_000).toISOString(), usedPercent: 68 },
      { timestamp: new Date().toISOString(), usedPercent: 65 },
    ],
  },
};

export const mockSettings: Settings = {
  enabledProviders: ["claude", "codex", "cursor", "gemini", "copilot"],
  refreshIntervalSecs: 300,
  providerSources: {},
  manualCookies: {},
  apiKeys: {},
  showAsUsed: false,
  resetTimeFormat: "relative",
  notificationsEnabled: true,
  warningThreshold: 70,
  criticalThreshold: 90,
  startAtLogin: false,
  globalShortcut: "Ctrl+Shift+U",
  animationsEnabled: true,
  privacyMode: false,
  soundEnabled: true,
  updateChannel: "stable",
  providerRefreshIntervals: {},
  theme: "light",
};

export const mockProviderInfos: ProviderInfo[] = [
  {
    id: "claude",
    name: "Claude",
    dashboardUrl: "https://claude.ai/settings/usage",
    hasStatusPage: true,
    supportsOauth: true,
    supportsCookies: true,
    supportsCli: true,
    supportsApiKey: false,
  },
  {
    id: "codex",
    name: "Codex",
    dashboardUrl: "https://platform.openai.com/usage",
    hasStatusPage: true,
    supportsOauth: true,
    supportsCookies: false,
    supportsCli: true,
    supportsApiKey: true,
  },
  {
    id: "cursor",
    name: "Cursor",
    dashboardUrl: "https://www.cursor.com/settings",
    hasStatusPage: true,
    supportsOauth: false,
    supportsCookies: true,
    supportsCli: false,
    supportsApiKey: false,
  },
  {
    id: "gemini",
    name: "Gemini",
    dashboardUrl: "https://aistudio.google.com",
    hasStatusPage: false,
    supportsOauth: true,
    supportsCookies: false,
    supportsCli: true,
    supportsApiKey: false,
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    dashboardUrl: "https://github.com/settings/copilot",
    hasStatusPage: true,
    supportsOauth: false,
    supportsCookies: false,
    supportsCli: false,
    supportsApiKey: false,
  },
];
