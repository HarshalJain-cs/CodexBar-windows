import type { ProviderUsage, ProviderStatus } from "@/lib/types";
import { providerColors, providerIcons } from "@/lib/colors";
import { ProgressBar } from "./ProgressBar";
import { ResetCountdown } from "./ResetCountdown";
import { StatusDot } from "./StatusDot";
import { openUrl, refreshProvider } from "@/lib/api";

interface ProviderCardProps {
  provider: ProviderUsage;
  status?: ProviderStatus;
  showAsUsed?: boolean;
  resetTimeFormat?: "relative" | "absolute";
  privacyMode?: boolean;
}

export function ProviderCard({
  provider,
  status,
  showAsUsed = false,
  resetTimeFormat = "relative",
  privacyMode = false,
}: ProviderCardProps) {
  const color = providerColors[provider.providerId] || "#71717a";
  const icon = providerIcons[provider.providerId] || "📊";
  const usage = provider.usage;

  const handleRefresh = async () => {
    try {
      await refreshProvider(provider.providerId);
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  const dashboardUrls: Record<string, string> = {
    codex: "https://platform.openai.com/usage",
    claude: "https://claude.ai/settings/usage",
    cursor: "https://www.cursor.com/settings",
    gemini: "https://aistudio.google.com",
    copilot: "https://github.com/settings/copilot",
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 space-y-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-medium" style={{ color }}>
            {provider.providerName}
          </span>
          {usage?.accountPlan && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {usage.accountPlan}
            </span>
          )}
          <StatusDot status={status} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800/50 text-zinc-500">
            {usage?.sourceLabel || "—"}
          </span>
          <button
            onClick={handleRefresh}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
            title="Refresh"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error state */}
      {provider.error && !usage && (
        <div className="text-xs text-red-400/80 bg-red-950/30 rounded px-2 py-1.5">
          {provider.error}
        </div>
      )}

      {/* Usage bars */}
      {usage && (
        <div className="space-y-2">
          <ProgressBar
            percent={usage.primary.usedPercent}
            label="Session"
            showAsUsed={showAsUsed}
          />
          <ResetCountdown
            resetsAt={usage.primary.resetsAt}
            format={resetTimeFormat}
            description={usage.primary.resetDescription}
          />

          {usage.secondary && (
            <>
              <ProgressBar
                percent={usage.secondary.usedPercent}
                label="Weekly"
                thin
                showAsUsed={showAsUsed}
              />
              <ResetCountdown
                resetsAt={usage.secondary.resetsAt}
                format={resetTimeFormat}
                description={usage.secondary.resetDescription}
              />
            </>
          )}

          {usage.modelSpecific && (
            <ProgressBar
              percent={usage.modelSpecific.usedPercent}
              label="Model"
              thin
              showAsUsed={showAsUsed}
            />
          )}
        </div>
      )}

      {/* Account info */}
      {usage?.accountEmail && !privacyMode && (
        <div className="text-[10px] text-zinc-600 truncate">
          {usage.accountEmail}
          {usage.accountOrg && ` · ${usage.accountOrg}`}
        </div>
      )}

      {/* Footer with dashboard link */}
      <div className="flex justify-end">
        <button
          onClick={() => openUrl(dashboardUrls[provider.providerId] || "#")}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Open Dashboard →
        </button>
      </div>

      {/* Stale indicator */}
      {provider.isStale && (
        <div className="text-[9px] text-amber-600/60">Data may be outdated</div>
      )}
    </div>
  );
}
