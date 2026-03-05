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
  const height = thin ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
          <span className="text-[11px] font-mono tabular-nums" style={{ color }}>
            {display.toFixed(0)}%{showAsUsed ? " used" : " left"}
          </span>
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-zinc-800/80 overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-700 ease-out relative`}
          style={{
            width: `${percent}%`,
            backgroundColor: color,
            boxShadow: percent > 80 ? `0 0 8px ${color}40` : undefined,
          }}
        >
          {!thin && percent > 5 && (
            <div
              className="absolute inset-0 rounded-full opacity-30"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
