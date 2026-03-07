import type { ProviderStatus } from "@/lib/types";

interface StatusBarProps {
  statuses: Record<string, ProviderStatus>;
}

export function StatusBar({ statuses }: StatusBarProps) {
  const values = Object.values(statuses);
  if (values.length === 0) return null;

  const hasIssue = values.some((s) => s.level !== "operational");
  const worstStatus = values.reduce(
    (worst, s) => {
      const severity: Record<string, number> = {
        operational: 0, degradedPerformance: 1, partialOutage: 2, majorOutage: 3, unknown: 0,
      };
      return (severity[s.level] || 0) > (severity[worst.level] || 0) ? s : worst;
    },
    values[0],
  );

  return (
    <div className="pt-3 mt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: hasIssue ? 'var(--warning)' : 'var(--success)' }}
        />
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          {hasIssue ? worstStatus.description : "All systems operational"}
        </span>
      </div>
    </div>
  );
}
