import type { ProviderUsage, ProviderStatus } from "@/lib/types";
import { getPacing } from "@/lib/types";
import { providerColors, providerIcons } from "@/lib/colors";
import { ProgressBar } from "./ProgressBar";
import { ResetCountdown } from "./ResetCountdown";
import { StatusDot } from "./StatusDot";
import { openUrl, refreshProvider } from "@/lib/api";
import { useState } from "react";

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
  const icon = providerIcons[provider.providerId] || "\u{1F4CA}";
  const usage = provider.usage;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProvider(provider.providerId);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const dashboardUrls: Record<string, string> = {
    codex: "https://platform.openai.com/usage",
    claude: "https://claude.ai/settings/usage",
    cursor: "https://www.cursor.com/settings",
    gemini: "https://aistudio.google.com",
    copilot: "https://github.com/settings/copilot",
  };

  // Pacing for session window
  const sessionPacing = usage ? getPacing(usage.primary) : null;
  const weeklyPacing = usage?.secondary ? getPacing(usage.secondary) : null;

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 to-zinc-900/60 p-3.5 space-y-2.5 backdrop-blur-sm hover:border-zinc-700/60 transition-colors">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{icon}</span>
          <span className="text-sm font-semibold tracking-tight" style={{ color }}>
            {provider.providerName}
          </span>
          {usage?.accountPlan && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 font-medium">
              {usage.accountPlan}
            </span>
          )}
          <StatusDot status={status} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800/50 text-zinc-500 font-mono">
            {usage?.sourceLabel || "\u2014"}
          </span>
          <button
            onClick={handleRefresh}
            className={`text-zinc-500 hover:text-zinc-300 transition-all p-0.5 ${isRefreshing ? "animate-spin" : ""}`}
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
        <div className="text-xs text-red-400/80 bg-red-950/30 rounded-lg px-2.5 py-2 border border-red-900/30">
          {provider.error}
        </div>
      )}

      {/* Usage bars */}
      {usage && (
        <div className="space-y-1.5">
          {/* Session usage */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Session</span>
              {sessionPacing && (
                <span className="text-[10px] text-zinc-500" title={sessionPacing.label}>
                  {sessionPacing.arrow} {sessionPacing.label}
                </span>
              )}
            </div>
            <ProgressBar
              percent={usage.primary.usedPercent}
              showAsUsed={showAsUsed}
            />
            <ResetCountdown
              resetsAt={usage.primary.resetsAt}
              format={resetTimeFormat}
              description={usage.primary.resetDescription}
            />
          </div>

          {/* Weekly usage */}
          {usage.secondary && (
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Weekly</span>
                {weeklyPacing && (
                  <span className="text-[10px] text-zinc-500" title={weeklyPacing.label}>
                    {weeklyPacing.arrow} {weeklyPacing.label}
                  </span>
                )}
              </div>
              <ProgressBar
                percent={usage.secondary.usedPercent}
                thin
                showAsUsed={showAsUsed}
              />
              <ResetCountdown
                resetsAt={usage.secondary.resetsAt}
                format={resetTimeFormat}
                description={usage.secondary.resetDescription}
              />
            </div>
          )}

          {/* Model-specific usage */}
          {usage.modelSpecific && (
            <div className="space-y-1 pt-0.5">
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Model</span>
              <ProgressBar
                percent={usage.modelSpecific.usedPercent}
                thin
                showAsUsed={showAsUsed}
              />
            </div>
          )}
        </div>
      )}

      {/* Account info + dashboard link */}
      <div className="flex items-center justify-between pt-0.5">
        {usage?.accountEmail && !privacyMode ? (
          <span className="text-[10px] text-zinc-600 truncate max-w-[200px]">
            {usage.accountEmail}
            {usage.accountOrg && ` \u00B7 ${usage.accountOrg}`}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={() => openUrl(dashboardUrls[provider.providerId] || "#")}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-0.5"
        >
          Dashboard
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </button>
      </div>

      {/* Stale indicator */}
      {provider.isStale && (
        <div className="text-[9px] text-amber-500/60 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500/40" />
          Data may be outdated
        </div>
      )}
    </div>
  );
}
