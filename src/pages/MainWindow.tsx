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

  // Filter to only enabled providers that have data or errors
  const enabledProviders = providers.filter((p) =>
    settings?.enabledProviders?.includes(p.providerId),
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 flex flex-col">
      <HeaderBar
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={refresh}
        onOpenSettings={onOpenSettings}
      />

      <div className="flex-1 overflow-y-auto py-2 space-y-2 scrollbar-thin">
        {enabledProviders.length === 0 && !loading ? (
          <EmptyState onOpenSettings={onOpenSettings} />
        ) : (
          enabledProviders.map((provider) => (
            <ProviderCard
              key={provider.providerId}
              provider={provider}
              status={statuses[provider.providerId]}
              trend={trends[provider.providerId]}
              showAsUsed={showAsUsed}
              resetTimeFormat={resetTimeFormat}
              privacyMode={privacyMode}
            />
          ))
        )}

        {loading && providers.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-zinc-500">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="animate-spin"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className="text-xs">Fetching usage data...</span>
            </div>
          </div>
        )}
      </div>

      <StatusBar statuses={statuses} />
    </div>
  );
}
