import { UsageTrend, TrendDirection } from '@/types';
import { useState } from 'react';

interface TrendChartProps {
  trend: UsageTrend;
  mini?: boolean;
}

function getSparklineColor(direction: TrendDirection): string {
  switch (direction) {
    case 'rising': return 'hsl(var(--cb-sparkline-rising))';
    case 'falling': return 'hsl(var(--cb-sparkline-falling))';
    case 'steady': return 'hsl(var(--cb-sparkline-steady))';
  }
}

function pointsToPath(points: { value: number }[], width: number, height: number, padding = 2): string {
  if (points.length < 2) return '';
  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (points.length - 1);

  return points
    .map((p, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((p.value - min) / range) * (height - padding * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function TrendChart({ trend, mini = true }: TrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const color = getSparklineColor(trend.direction);
  const width = mini ? 50 : 200;
  const height = mini ? 20 : 80;
  const padding = mini ? 2 : 8;
  const path = pointsToPath(trend.points, width, height, padding);

  const values = trend.points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (trend.points.length - 1);

  return (
    <div className="relative inline-block">
      <svg width={width} height={height} className="block">
        <path d={path} fill="none" stroke={color} strokeWidth={mini ? 1.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
        {!mini &&
          trend.points.map((pt, i) => {
            const x = padding + i * stepX;
            const y = height - padding - ((pt.value - min) / range) * (height - padding * 2);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={hoveredIdx === i ? 4 : 2.5}
                fill={color}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
      </svg>
      {!mini && hoveredIdx !== null && (
        <div
          className="absolute z-10 rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md cb-mono pointer-events-none"
          style={{
            left: `${padding + hoveredIdx * stepX}px`,
            top: '-28px',
            transform: 'translateX(-50%)',
          }}
        >
          {trend.points[hoveredIdx].value}%
          <span className="ml-1 text-muted-foreground">
            {new Date(trend.points[hoveredIdx].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  );
}
