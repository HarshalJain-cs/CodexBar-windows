import { Provider, ProviderId } from '@/types';
import { providerLogos } from '@/data/providerLogos';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useState, useMemo } from 'react';

interface UsageHistoryChartProps {
  providers: Provider[];
  animationsEnabled?: boolean;
}

type TimeRange = '8h' | '24h' | '7d';

function generateHistoryData(providers: Provider[], range: TimeRange) {
  const now = Date.now();
  const hour = 3600000;
  const intervals = range === '8h' ? 8 : range === '24h' ? 24 : 7 * 24;
  const step = range === '7d' ? 24 * hour : hour;

  return Array.from({ length: intervals }, (_, i) => {
    const timestamp = now - (intervals - 1 - i) * step;
    const point: Record<string, number | string> = {
      time: range === '7d'
        ? new Date(timestamp).toLocaleDateString('en', { weekday: 'short' })
        : new Date(timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
    };
    providers.forEach(p => {
      const trendPoint = p.usage.trend.points[Math.min(i, p.usage.trend.points.length - 1)];
      const base = trendPoint?.value ?? p.usage.sessionPercent;
      const jitter = Math.floor(Math.random() * 8 - 4);
      point[p.id] = Math.max(0, Math.min(100, base + jitter + (i * (Math.random() > 0.5 ? 1 : -1))));
    });
    return point;
  });
}

const CHART_COLORS: Record<string, string> = {
  codex: 'hsl(217, 91%, 60%)',
  claude: 'hsl(30, 80%, 55%)',
  cursor: 'hsl(142, 71%, 45%)',
  gemini: 'hsl(262, 83%, 58%)',
  copilot: 'hsl(195, 85%, 50%)',
  windsurf: 'hsl(175, 70%, 45%)',
  kiro: 'hsl(20, 85%, 55%)',
  augment: 'hsl(155, 70%, 50%)',
  devin: 'hsl(270, 70%, 55%)',
};

export default function UsageHistoryChart({ providers, animationsEnabled = true }: UsageHistoryChartProps) {
  const [range, setRange] = useState<TimeRange>('8h');
  const [visibleProviders, setVisibleProviders] = useState<Set<ProviderId>>(
    () => new Set(providers.slice(0, 3).map(p => p.id))
  );
  const [data] = useState(() => ({
    '8h': generateHistoryData(providers, '8h'),
    '24h': generateHistoryData(providers, '24h'),
    '7d': generateHistoryData(providers, '7d'),
  }));

  const toggleProvider = (id: ProviderId) => {
    setVisibleProviders(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least 1
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectOnly = (id: ProviderId) => {
    setVisibleProviders(new Set([id]));
  };

  const selectAll = () => {
    setVisibleProviders(new Set(providers.map(p => p.id)));
  };

  const ranges: { value: TimeRange; label: string }[] = [
    { value: '8h', label: '8h' },
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
  ];

  const activeProviders = useMemo(
    () => providers.filter(p => visibleProviders.has(p.id)),
    [providers, visibleProviders]
  );

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-card-foreground">Usage History</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="text-[9px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-border hover:bg-secondary"
          >
            All
          </button>
          <div className="flex rounded-md border border-border overflow-hidden">
            {ranges.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  range === r.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggleable provider chips */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {providers.map(p => {
          const active = visibleProviders.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggleProvider(p.id)}
              onDoubleClick={() => selectOnly(p.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium transition-all border ${
                active
                  ? 'border-transparent text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground bg-secondary/50'
              }`}
              style={active ? { background: CHART_COLORS[p.id] || 'hsl(var(--primary))' } : undefined}
              title={`Click to toggle, double-click to solo ${p.name}`}
            >
              <img src={providerLogos[p.id]} alt={p.name} className="h-3 w-3 rounded-sm object-contain" />
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data[range]} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              {activeProviders.map(p => (
                <linearGradient key={p.id} id={`gradient-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[p.id] || 'hsl(var(--primary))'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS[p.id] || 'hsl(var(--primary))'} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '11px',
                color: 'hsl(var(--card-foreground))',
              }}
              formatter={(value: number, name: string) => [`${value}%`, name.charAt(0).toUpperCase() + name.slice(1)]}
            />
            {activeProviders.map(p => (
              <Area
                key={p.id}
                type="monotone"
                dataKey={p.id}
                stroke={CHART_COLORS[p.id] || 'hsl(var(--primary))'}
                strokeWidth={1.5}
                fill={`url(#gradient-${p.id})`}
                isAnimationActive={animationsEnabled}
                animationDuration={800}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[9px] text-muted-foreground mt-1.5 text-center">
        Click providers to toggle · Double-click to solo
      </div>
    </div>
  );
}
