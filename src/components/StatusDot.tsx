import type { ProviderStatus } from "@/lib/types";

interface StatusDotProps {
  status?: ProviderStatus;
}

const statusColors: Record<string, string> = {
  operational: "bg-green-500",
  degradedPerformance: "bg-yellow-500",
  partialOutage: "bg-orange-500",
  majorOutage: "bg-red-500",
  unknown: "bg-zinc-500",
};

export function StatusDot({ status }: StatusDotProps) {
  if (!status) return null;

  const color = statusColors[status.level] || "bg-zinc-500";

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${color}`}
      title={status.description}
    />
  );
}
