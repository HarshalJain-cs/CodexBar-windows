import { Provider } from '@/types';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3 } from 'lucide-react';

interface UsageHeatmapProps {
  providers: Provider[];
  animationsEnabled?: boolean;
  privacyMode?: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Generate synthetic heatmap data from provider usage patterns
function generateHeatmapData(providers: Provider[]): number[][] {
  const storageKey = 'cb-heatmap-data';
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.length === 7 && parsed[0].length === 24) return parsed;
    }
  } catch { /* generate fresh */ }

  const avgSession = providers.reduce((s, p) => s + p.usage.sessionPercent, 0) / Math.max(providers.length, 1);
  const now = new Date();
  const currentDay = (now.getDay() + 6) % 7; // Mon=0
  const currentHour = now.getHours();

  const grid: number[][] = [];
  for (let d = 0; d < 7; d++) {
    const row: number[] = [];
    for (let h = 0; h < 24; h++) {
      // Work hours (9-18) get higher usage
      const isWorkHours = h >= 9 && h <= 18;
      const isWeekend = d >= 5;
      let base = isWorkHours ? 40 + avgSession * 0.4 : 10 + avgSession * 0.1;
      if (isWeekend) base *= 0.4;

      // Current day/hour gets actual usage signal
      if (d === currentDay && h <= currentHour) {
        base = avgSession * 0.6 + Math.random() * 20;
      }

      // Add natural variance
      const jitter = (Math.random() - 0.5) * 20;
      row.push(Math.max(0, Math.min(100, Math.round(base + jitter))));
    }
    grid.push(row);
  }

  try { localStorage.setItem(storageKey, JSON.stringify(grid)); } catch { /* ok */ }
  return grid;
}

function getHeatColor(value: number): string {
  if (value >= 80) return 'var(--cb-heatmap-4)';
  if (value >= 60) return 'var(--cb-heatmap-3)';
  if (value >= 40) return 'var(--cb-heatmap-2)';
  if (value >= 20) return 'var(--cb-heatmap-1)';
  return 'var(--cb-heatmap-0)';
}

export default function UsageHeatmap({
  providers,
  animationsEnabled = true,
  privacyMode = false,
}: UsageHeatmapProps) {
  const [hovered, setHovered] = useState<{ day: number; hour: number } | null>(null);
  const data = useMemo(() => generateHeatmapData(providers), [providers]);

  const cellSize = 12;
  const labelWidth = 28;
  const headerHeight = 16;
  const gap = 2;
  const width = labelWidth + 24 * (cellSize + gap);
  const height = headerHeight + 7 * (cellSize + gap);

  return (
    <motion.div
      className="rounded-lg border border-border bg-card p-3"
      initial={animationsEnabled ? { opacity: 0, y: 8 } : undefined}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Grid3X3 size={12} className="text-primary" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Usage Heatmap</span>
        <span className="text-[9px] text-muted-foreground ml-auto">7 days x 24 hours</span>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height + 12}
          viewBox={`0 0 ${width} ${height + 12}`}
          className="block mx-auto"
          role="img"
          aria-label="Usage heatmap showing activity intensity across days and hours"
        >
          {/* Hour labels */}
          {HOURS.filter(h => h % 3 === 0).map(h => (
            <text
              key={`h-${h}`}
              x={labelWidth + h * (cellSize + gap) + cellSize / 2}
              y={10}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: '8px', fontFamily: "'JetBrains Mono', monospace" }}
            >
              {h.toString().padStart(2, '0')}
            </text>
          ))}

          {/* Grid cells */}
          {DAYS.map((day, d) => (
            <g key={day}>
              {/* Day label */}
              <text
                x={0}
                y={headerHeight + d * (cellSize + gap) + cellSize / 2 + 3}
                className="fill-muted-foreground"
                style={{ fontSize: '8px', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {day}
              </text>

              {/* Hour cells */}
              {HOURS.map(h => {
                const value = data[d][h];
                const isHovered = hovered?.day === d && hovered?.hour === h;
                return (
                  <rect
                    key={`${d}-${h}`}
                    x={labelWidth + h * (cellSize + gap)}
                    y={headerHeight + d * (cellSize + gap)}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    fill={privacyMode ? 'hsl(var(--muted))' : getHeatColor(value)}
                    stroke={isHovered ? 'hsl(var(--foreground))' : 'none'}
                    strokeWidth={isHovered ? 1 : 0}
                    opacity={privacyMode ? 0.3 : 1}
                    onMouseEnter={() => setHovered({ day: d, hour: h })}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'crosshair', transition: 'opacity 0.15s' }}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      {hovered && !privacyMode && (
        <div className="text-center text-[10px] text-muted-foreground mt-1">
          {DAYS[hovered.day]} {hovered.hour.toString().padStart(2, '0')}:00 —{' '}
          <span className="font-mono font-semibold text-card-foreground">
            {data[hovered.day][hovered.hour]}%
          </span>{' '}
          avg usage
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="text-[8px] text-muted-foreground">Low</span>
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ background: `var(--cb-heatmap-${i})` }}
          />
        ))}
        <span className="text-[8px] text-muted-foreground">High</span>
      </div>
    </motion.div>
  );
}
