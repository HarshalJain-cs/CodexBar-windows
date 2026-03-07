import type { ProviderUsage, ProviderStatus, UsageTrend } from "@/lib/types";
import { getPacing, getUsageLevel } from "@/lib/types";
import { providerColors, providerIcons, usageLevelColors } from "@/lib/colors";
import { ProgressBar } from "./ProgressBar";
import { ResetCountdown } from "./ResetCountdown";
import { openUrl, refreshProvider } from "@/lib/api";
import { useState } from "react";

interface ProviderCardProps {
  provider: ProviderUsage;
  status?: ProviderStatus;
  trend?: UsageTrend;
  showAsUsed?: boolean;
  resetTimeFormat?: "relative" | "absolute";
  privacyMode?: boolean;
}

const sourceStyles: Record<string, { label: string; bg: string; color: string }> = {
  oauth: { label: "OAuth", bg: "#edf2ff", color: "#4263eb" },
  web: { label: "Web", bg: "#f3f0ff", color: "#7048e8" },
  cli: { label: "CLI", bg: "#ebfbee", color: "#2b8a3e" },
  apikey: { label: "Key", bg: "#fff9db", color: "#e67700" },
};

const statusDotColors: Record<string, string> = {
  operational: "#40c057",
  degradedPerformance: "#fab005",
  partialOutage: "#fd7e14",
  majorOutage: "#fa5252",
  unknown: "#868e96",
};

const trendConfig: Record<string, { arrow: string; color: string; label: string }> = {
  rising: { arrow: "\u2191", color: "#fa5252", label: "Usage rising" },
  falling: { arrow: "\u2193", color: "#40c057", label: "Usage falling" },
  steady: { arrow: "\u2192", color: "#868e96", label: "Steady" },
};

const dashboardUrls: Record<string, string> = {
  codex: "https://platform.openai.com/usage",
  claude: "https://claude.ai/settings/usage",
  cursor: "https://www.cursor.com/settings",
  gemini: "https://aistudio.google.com",
  copilot: "https://github.com/settings/copilot",
};

export function ProviderCard({
  provider,
  status,
  trend,
  showAsUsed = false,
  resetTimeFormat = "relative",
  privacyMode = false,
}: ProviderCardProps) {
  const color = providerColors[provider.providerId] || "#868e96";
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

  const sessionPacing = usage ? getPacing(usage.primary) : null;
  const weeklyPacing = usage?.secondary ? getPacing(usage.secondary) : null;

  const source = usage?.sourceLabel?.toLowerCase() || "";
  const sourceBadge = sourceStyles[source];

  const isOutage = status && (status.level === "partialOutage" || status.level === "majorOutage");

  // Primary usage display
  const primaryPercent = usage?.primary.usedPercent ?? 0;
  const primaryLevel = getUsageLevel(primaryPercent);
  const primaryColor = usageLevelColors[primaryLevel];
  const displayPercent = showAsUsed ? primaryPercent : Math.max(0, 100 - primaryPercent);

  return (
    <div className={`cb-card ${isOutage ? "cb-card-outage" : ""} animate-fade-in`} style={{ padding: '14px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: `${color}15`, border: `1px solid ${color}25` }}
          >
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {provider.providerName}
              </span>
              {usage?.accountPlan && (
                <span className="cb-badge" style={{ fontSize: 9 }}>
                  {usage.accountPlan}
                </span>
              )}
              {sourceBadge && (
                <span
                  className="cb-badge"
                  style={{ fontSize: 9, background: sourceBadge.bg, color: sourceBadge.color, borderColor: `${sourceBadge.color}20` }}
                >
                  {sourceBadge.label}
                </span>
              )}
            </div>
            {usage && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[18px] font-bold font-mono tabular-nums" style={{ color: primaryColor, lineHeight: 1 }}>
                  {displayPercent.toFixed(0)}%
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {showAsUsed ? "used" : "left"}
                </span>
                {trend?.trend && trendConfig[trend.trend] && (
                  <span
                    className="text-xs font-semibold ml-0.5"
                    style={{ color: trendConfig[trend.trend].color }}
                    title={trendConfig[trend.trend].label}
                  >
                    {trendConfig[trend.trend].arrow}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {status && (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${status.level === "majorOutage" ? "animate-pulse" : ""}`}
              style={{ background: statusDotColors[status.level] || statusDotColors.unknown }}
              title={status.description}
            />
          )}
          <button
            onClick={handleRefresh}
            className="p-1 rounded-md transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            title="Refresh"
          >
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={isRefreshing ? "animate-spin" : ""}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Outage banner */}
      {isOutage && status && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-[11px] font-medium"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--danger)' }} />
          {status.description}
        </div>
      )}

      {/* Error state */}
      {provider.error && !usage && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[11px]"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 15%, transparent)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {provider.error}
        </div>
      )}

      {/* Usage bars */}
      {usage && (
        <div className="space-y-3">
          {/* Session */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Session
              </span>
              {sessionPacing && (
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }} title={sessionPacing.label}>
                  {sessionPacing.arrow} {sessionPacing.label}
                </span>
              )}
            </div>
            <ProgressBar percent={usage.primary.usedPercent} showAsUsed={showAsUsed} />
            <ResetCountdown resetsAt={usage.primary.resetsAt} format={resetTimeFormat} description={usage.primary.resetDescription} />
          </div>

          {/* Weekly */}
          {usage.secondary && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Weekly
                </span>
                {weeklyPacing && (
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }} title={weeklyPacing.label}>
                    {weeklyPacing.arrow} {weeklyPacing.label}
                  </span>
                )}
              </div>
              <ProgressBar percent={usage.secondary.usedPercent} thin showAsUsed={showAsUsed} />
              <ResetCountdown resetsAt={usage.secondary.resetsAt} format={resetTimeFormat} description={usage.secondary.resetDescription} />
            </div>
          )}

          {/* Model-specific */}
          {usage.modelSpecific && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Model limit
                </span>
              </div>
              <ProgressBar percent={usage.modelSpecific.usedPercent} thin showAsUsed={showAsUsed} />
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {usage?.accountEmail && !privacyMode ? (
          <span className="text-[10px] truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>
            {usage.accountEmail}
            {usage.accountOrg && ` \u00B7 ${usage.accountOrg}`}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={() => openUrl(dashboardUrls[provider.providerId] || "#")}
          className="flex items-center gap-1 text-[10px] font-medium transition-colors"
          style={{ color: 'var(--accent)' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Dashboard
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </button>
      </div>

      {/* Stale */}
      {provider.isStale && !provider.error && (
        <div className="flex items-center gap-1.5 mt-2 text-[9px] font-medium" style={{ color: 'var(--warning)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--warning)', opacity: 0.6 }} />
          Data may be outdated
        </div>
      )}
    </div>
  );
}
