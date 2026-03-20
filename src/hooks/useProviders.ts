import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Provider, ProviderId, ProviderStatus, UsageTrend } from '@/types';
import { mockProviders } from '@/data/mockData';

export interface RefreshLog {
  provider: string;
  timestamp: number;
  success: boolean;
  duration: number;
}

// ----- Backend type definitions (mirroring Rust serde output) -----

interface BackendRateWindow {
  usedPercent: number;
  windowMinutes: number | null;
  resetsAt: string | null;
  resetDescription: string | null;
}

interface BackendUsageSnapshot {
  primary: BackendRateWindow;
  secondary: BackendRateWindow | null;
  modelSpecific: BackendRateWindow | null;
  accountEmail: string | null;
  accountOrg: string | null;
  accountPlan: string | null;
  sourceLabel: string;
  updatedAt: string;
}

interface BackendFetchResult {
  providerId: string;
  providerName: string;
  usage: BackendUsageSnapshot | null;
  cost: unknown;
  error: string | null;
  isStale: boolean;
}

interface BackendProviderStatus {
  providerId: string;
  level: string; // 'operational' | 'degradedPerformance' | 'partialOutage' | 'majorOutage' | 'unknown'
  description: string;
}

interface BackendTrend {
  providerId: string;
  trend: string | null;
  points: { timestamp: string; usedPercent: number }[];
}

// Provider IDs supported by the Rust backend
const BACKEND_PROVIDER_IDS = ['codex', 'claude', 'cursor', 'gemini', 'copilot'];

// Status page URLs for providers
const STATUS_PAGE_URLS: Record<string, string> = {
  codex: 'https://status.openai.com',
  claude: 'https://status.anthropic.com',
  cursor: 'https://status.cursor.com',
  gemini: 'https://status.cloud.google.com',
  copilot: 'https://www.githubstatus.com',
  windsurf: 'https://status.codeium.com',
  kiro: 'https://kiro.dev',
  augment: 'https://augmentcode.com',
  devin: 'https://devin.ai',
};

function mapStatusLevel(level: string): ProviderStatus {
  switch (level) {
    case 'operational': return 'operational';
    case 'degradedPerformance': return 'degraded';
    case 'partialOutage':
    case 'majorOutage': return 'outage';
    default: return 'unknown';
  }
}

function mapTrendDirection(trend: string | null): 'rising' | 'falling' | 'steady' {
  if (trend === 'rising') return 'rising';
  if (trend === 'falling') return 'falling';
  return 'steady';
}

function mapAuthStatus(result: BackendFetchResult): 'authenticated' | 'expired' | 'not_configured' {
  if (result.usage) return 'authenticated';
  if (result.error?.toLowerCase().includes('auth') || result.error?.toLowerCase().includes('expired')) return 'expired';
  if (result.error) return 'not_configured';
  return 'not_configured';
}

function formatWindowLabel(rw: BackendRateWindow, type: string): string {
  const pct = Math.round(rw.usedPercent);
  if (rw.resetDescription) return rw.resetDescription;
  return `${pct}% used (${type})`;
}

/** Transform backend data into frontend Provider format */
function transformToProvider(
  result: BackendFetchResult,
  status: BackendProviderStatus | null,
  trend: BackendTrend | null,
): Provider {
  const id = result.providerId as ProviderId;
  const now = Date.now();

  const sessionPercent = result.usage?.primary.usedPercent ?? 0;
  const weeklyPercent = result.usage?.secondary?.usedPercent ?? 0;

  const trendPoints = trend?.points.map(p => ({
    timestamp: new Date(p.timestamp).getTime(),
    value: p.usedPercent,
  })) ?? [{ timestamp: now, value: sessionPercent }];

  const usageTrend: UsageTrend = {
    direction: mapTrendDirection(trend?.trend ?? null),
    points: trendPoints,
  };

  const statusLevel = status ? mapStatusLevel(status.level) : 'unknown';

  return {
    id,
    name: result.providerName,
    icon: '',
    enabled: true,
    authStatus: mapAuthStatus(result),
    usage: {
      sessionPercent: Math.round(sessionPercent),
      weeklyPercent: Math.round(weeklyPercent),
      sessionLabel: result.usage ? formatWindowLabel(result.usage.primary, 'session') : 'No data',
      weeklyLabel: result.usage?.secondary ? formatWindowLabel(result.usage.secondary, 'weekly') : 'No data',
      trend: usageTrend,
    },
    statusInfo: {
      status: statusLevel,
      description: status?.description ?? 'Status unavailable',
      lastChecked: now,
      statusPageUrl: STATUS_PAGE_URLS[id] ?? '',
      history: [],
    },
  };
}

/** Get mock providers for IDs not supported by backend */
function getUnsupportedProviders(): Provider[] {
  return mockProviders
    .filter(p => !BACKEND_PROVIDER_IDS.includes(p.id))
    .map(p => ({ ...p, authStatus: 'not_configured' as const }));
}

export function useProviders(refreshInterval: number = 30) {
  const [providers, setProviders] = useState<Provider[]>(mockProviders);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [refreshLogs, setRefreshLogs] = useState<RefreshLog[]>([]);
  const [countdown, setCountdown] = useState(refreshInterval);
  const [retryCount, setRetryCount] = useState(0);
  const refreshIntervalRef = useRef(refreshInterval);

  // Keep ref in sync
  useEffect(() => {
    refreshIntervalRef.current = refreshInterval;
    setCountdown(refreshInterval);
  }, [refreshInterval]);

  const addLog = useCallback((provider: string, success: boolean, duration: number) => {
    setRefreshLogs(prev => [...prev.slice(-49), { provider, timestamp: Date.now(), success, duration }]);
  }, []);

  /** Fetch all data from backend and merge with unsupported providers */
  const fetchAllData = useCallback(async (): Promise<Provider[]> => {
    try {
      // Fetch usage, status, and trends in parallel
      const [results, statuses, trends] = await Promise.all([
        invoke<BackendFetchResult[]>('get_all_usage'),
        invoke<BackendProviderStatus[]>('get_provider_status').catch(() => [] as BackendProviderStatus[]),
        invoke<BackendTrend[]>('get_usage_trends').catch(() => [] as BackendTrend[]),
      ]);

      const statusMap = new Map(statuses.map(s => [s.providerId, s]));
      const trendMap = new Map(trends.map(t => [t.providerId, t]));

      const backendProviders = results.map(result =>
        transformToProvider(
          result,
          statusMap.get(result.providerId) ?? null,
          trendMap.get(result.providerId) ?? null,
        )
      );

      // Merge with unsupported providers (windsurf, kiro, augment, devin)
      const unsupported = getUnsupportedProviders();
      return [...backendProviders, ...unsupported];
    } catch (err) {
      console.error('Failed to fetch from backend:', err);
      return mockProviders; // Fallback to mock data
    }
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;
    fetchAllData().then(data => {
      if (mounted) {
        setProviders(data);
        setIsLoading(false);
        setLastRefresh(Date.now());
      }
    });
    return () => { mounted = false; };
  }, [fetchAllData]);

  // Listen for backend usage-updated events
  useEffect(() => {
    const unlisten = listen('usage-updated', () => {
      fetchAllData().then(data => {
        setProviders(data);
        setLastRefresh(Date.now());
      });
    });
    return () => { unlisten.then(fn => fn()); };
  }, [fetchAllData]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    const start = Date.now();
    try {
      await invoke<BackendFetchResult[]>('refresh_all');
      const data = await fetchAllData();
      setProviders(data);
      const duration = Date.now() - start;
      addLog('all', true, duration);
      setRetryCount(0); // Reset retry on success
    } catch (err) {
      console.error('Refresh failed:', err);
      addLog('all', false, Date.now() - start);
      setRetryCount(prev => prev + 1);
      // Exponential backoff retry (max 3 retries)
      const currentRetry = retryCount;
      if (currentRetry < 3) {
        const backoff = Math.min(5000 * Math.pow(2, currentRetry), 30000);
        setTimeout(() => {
          if (!isPaused) refresh();
        }, backoff);
      }
    }
    setLastRefresh(Date.now());
    setCountdown(refreshIntervalRef.current);
    setIsRefreshing(false);
  }, [addLog, fetchAllData, retryCount, isPaused]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const refreshProvider = useCallback(async (id: string) => {
    // For unsupported providers, just simulate
    if (!BACKEND_PROVIDER_IDS.includes(id)) return;

    const start = Date.now();
    setIsRefreshing(true);
    try {
      await invoke<BackendFetchResult>('refresh_provider', { providerId: id });
      const data = await fetchAllData();
      setProviders(data);
      addLog(id, true, Date.now() - start);
    } catch (err) {
      console.error(`Refresh ${id} failed:`, err);
      addLog(id, false, Date.now() - start);
    }
    setLastRefresh(Date.now());
    setIsRefreshing(false);
  }, [addLog, fetchAllData]);

  const disableProvider = useCallback((id: ProviderId) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, enabled: false } : p));
  }, []);

  // Auto-refresh via frontend timer (backend also has its own refresh loop)
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      refresh();
    }, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refreshInterval, refresh, isPaused]);

  // Countdown timer
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? refreshIntervalRef.current : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isPaused]);

  return {
    providers,
    isRefreshing,
    isLoading,
    isPaused,
    lastRefresh,
    countdown,
    refreshLogs,
    refresh,
    refreshProvider,
    disableProvider,
    setProviders,
    togglePause,
  };
}
