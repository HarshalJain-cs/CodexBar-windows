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
        operational: 0,
        degradedPerformance: 1,
        partialOutage: 2,
        majorOutage: 3,
        unknown: 0,
      };
      return (severity[s.level] || 0) > (severity[worst.level] || 0) ? s : worst;
    },
    values[0],
  );

  return (
    <div className="px-1 pt-2 border-t border-zinc-800/50">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            hasIssue ? "bg-yellow-500" : "bg-green-500"
          }`}
        />
        <span className="text-[10px] text-zinc-500">
          {hasIssue ? worstStatus.description : "All systems operational"}
        </span>
      </div>
    </div>
  );
}
