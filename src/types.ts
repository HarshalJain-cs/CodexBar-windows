// CodexBar Types

export type ProviderId = 'codex' | 'claude' | 'cursor' | 'gemini' | 'copilot' | 'windsurf' | 'kiro' | 'augment' | 'devin';

export type TrendDirection = 'rising' | 'falling' | 'steady';

export interface UsageTrendPoint {
  timestamp: number;
  value: number;
}

export interface UsageTrend {
  direction: TrendDirection;
  points: UsageTrendPoint[];
}

export interface UsageData {
  sessionPercent: number;
  weeklyPercent: number;
  sessionLabel: string;
  weeklyLabel: string;
  trend: UsageTrend;
}

export type ProviderStatus = 'operational' | 'degraded' | 'outage' | 'unknown';

export interface ProviderStatusInfo {
  status: ProviderStatus;
  description: string;
  lastChecked: number;
  statusPageUrl: string;
  history: { status: ProviderStatus; timestamp: number }[];
}

export interface Provider {
  id: ProviderId;
  name: string;
  icon: string;
  enabled: boolean;
  usage: UsageData;
  statusInfo: ProviderStatusInfo;
  authStatus: 'authenticated' | 'expired' | 'not_configured';
}

export type ThemeMode = 'dark' | 'light' | 'system';
export type NotificationType = 'system' | 'in-app' | 'both';
export type NotificationSound = 'default' | 'custom' | 'none';
export type ViewMode = 'grid' | 'compact';

export interface AppSettings {
  theme: ThemeMode;
  refreshInterval: number;
  animationsEnabled: boolean;
  notificationType: NotificationType;
  notificationSound: NotificationSound;
  soundEnabled: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  launchAtStartup: boolean;
  globalShortcut: string;
  viewMode: ViewMode;
  providerOrder: ProviderId[];
  enabledProviders: ProviderId[];
}

export type SettingsTab = 'general' | 'display' | 'providers' | 'auth' | 'about';
