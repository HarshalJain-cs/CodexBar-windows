import { useUsageData } from "@/hooks/useUsageData";
import { useProviderStatus } from "@/hooks/useProviderStatus";
import { useSettings } from "@/hooks/useSettings";
import { useUsageTrends } from "@/hooks/useUsageTrends";
import { ProviderCard } from "@/components/ProviderCard";
import { HeaderBar } from "@/components/HeaderBar";
import { EmptyState } from "@/components/EmptyState";
import { StatusBar } from "@/components/StatusBar";

interface MainWindowProps {
  onOpenSettings: () => void;
}

export function MainWindow({ onOpenSettings }: MainWindowProps) {
  const { providers, loading, lastUpdated, refresh } = useUsageData();
  const statuses = useProviderStatus();
  const { settings } = useSettings();
  const trends = useUsageTrends();

  const showAsUsed = settings?.showAsUsed ?? false;
  const resetTimeFormat = (settings?.resetTimeFormat ?? "relative") as "relative" | "absolute";
  const privacyMode = settings?.privacyMode ?? false;

  const enabledProviders = providers.filter((p) =>
    settings?.enabledProviders?.includes(p.providerId),
  );

  return (
    <div className="min-h-screen flex flex-col p-4" style={{ background: 'var(--bg-base)' }}>
      <HeaderBar
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={refresh}
        onOpenSettings={onOpenSettings}
      />

      <div className="flex-1 overflow-y-auto py-3">
        {enabledProviders.length === 0 && !loading ? (
          <EmptyState onOpenSettings={onOpenSettings} />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {enabledProviders.map((provider) => (
              <ProviderCard
                key={provider.providerId}
                provider={provider}
                status={statuses[provider.providerId]}
                trend={trends[provider.providerId]}
                showAsUsed={showAsUsed}
                resetTimeFormat={resetTimeFormat}
                privacyMode={privacyMode}
              />
            ))}
          </div>
        )}

        {loading && providers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg
              width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className="animate-spin"
              style={{ color: 'var(--accent)' }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Fetching usage data...</span>
          </div>
        )}
      </div>

      <StatusBar statuses={statuses} />
    </div>
  );
}
