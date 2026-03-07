import { getUsageLevel } from "@/lib/types";
import { usageLevelColors } from "@/lib/colors";

interface ProgressBarProps {
  percent: number;
  label?: string;
  thin?: boolean;
  showAsUsed?: boolean;
}

export function ProgressBar({ percent, label, thin, showAsUsed }: ProgressBarProps) {
  const level = getUsageLevel(percent);
  const color = usageLevelColors[level];
  const display = showAsUsed ? percent : Math.max(0, 100 - percent);
  const height = thin ? 5 : 8;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            {label}
          </span>
          <span className="text-[11px] font-semibold font-mono tabular-nums" style={{ color }}>
            {display.toFixed(0)}%{showAsUsed ? " used" : " left"}
          </span>
        </div>
      )}
      <div className="cb-progress-track" style={{ height }}>
        <div
          className="cb-progress-fill"
          style={{
            width: `${Math.min(100, percent)}%`,
            height,
            backgroundColor: color,
            boxShadow: percent > 80 ? `0 0 12px ${color}50` : undefined,
          }}
        />
      </div>
    </div>
  );
}
