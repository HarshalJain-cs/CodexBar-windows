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
import { useState, useMemo, useEffect, useRef } from 'react';

interface UsageHistoryChartProps {
  providers: Provider[];
  animationsEnabled?: boolean;
}

type TimeRange = '8h' | '24h' | '7d';

const SNAPSHOT_KEY = 'cb-usage-snapshots';
const MAX_SNAPSHOTS = 168; // 7 days of hourly snapshots

interface StoredSnapshot {
  timestamp: number;
  data: Record<string, number>; // providerId -> sessionPercent
}

function loadSnapshots(): StoredSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSnapshots(snapshots: StoredSnapshot[]) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.slice(-MAX_SNAPSHOTS)));
  } catch { /* ok */ }
}

function snapshotProviders(providers: Provider[]): StoredSnapshot {
  const data: Record<string, number> = {};
  providers.forEach(p => { data[p.id] = p.usage.sessionPercent; });
  return { timestamp: Date.now(), data };
}

function buildChartData(
  snapshots: StoredSnapshot[],
  providers: Provider[],
  range: TimeRange
): Record<string, number | string>[] {
  const now = Date.now();
  const hour = 3600000;
  const cutoff = range === '8h' ? now - 8 * hour
    : range === '24h' ? now - 24 * hour
    : now - 7 * 24 * hour;

  const relevant = snapshots.filter(s => s.timestamp >= cutoff);

  if (relevant.length === 0) {
    // No historical data yet — show current as single point
    const point: Record<string, number | string> = {
      time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
    };
    providers.forEach(p => { point[p.id] = p.usage.sessionPercent; });
    return [point];
  }

  // Bucket into time slots
  const intervals = range === '8h' ? 8 : range === '24h' ? 24 : 7 * 24;
  const step = (now - cutoff) / intervals;

  return Array.from({ length: intervals }, (_, i) => {
    const slotStart = cutoff + i * step;
    const slotEnd = slotStart + step;
    const slotLabel = range === '7d'
      ? new Date(slotStart).toLocaleDateString('en', { weekday: 'short', hour: '2-digit' })
      : new Date(slotStart).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });

    // Find closest snapshot in this slot
    const inSlot = relevant.filter(s => s.timestamp >= slotStart && s.timestamp < slotEnd);
    const snapshot = inSlot.length > 0
      ? inSlot[inSlot.length - 1] // latest in slot
      : null;

    const point: Record<string, number | string> = { time: slotLabel };
    providers.forEach(p => {
      point[p.id] = snapshot?.data[p.id] ?? 0;
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
  const [snapshots, setSnapshots] = useState<StoredSnapshot[]>(loadSnapshots);
  const lastSnapshotRef = useRef<number>(0);

  // Record a snapshot every 5 minutes
  useEffect(() => {
    const now = Date.now();
    if (now - lastSnapshotRef.current < 300000) return; // 5 min debounce

    const newSnapshot = snapshotProviders(providers);
    setSnapshots(prev => {
      const updated = [...prev, newSnapshot];
      saveSnapshots(updated);
      return updated.slice(-MAX_SNAPSHOTS);
    });
    lastSnapshotRef.current = now;
  }, [providers]);

  // Also snapshot on mount if nothing recent
  useEffect(() => {
    const existing = loadSnapshots();
    if (existing.length === 0 || Date.now() - existing[existing.length - 1].timestamp > 300000) {
      const initial = snapshotProviders(providers);
      const updated = [...existing, initial];
      saveSnapshots(updated);
      setSnapshots(updated.slice(-MAX_SNAPSHOTS));
      lastSnapshotRef.current = Date.now();
    }
  }, []);

  const data = useMemo(
    () => buildChartData(snapshots, providers, range),
    [snapshots, providers, range]
  );

  const toggleProvider = (id: ProviderId) => {
    setVisibleProviders(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
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
          <span className="text-[9px] text-muted-foreground font-mono">
            {snapshots.length} pts
          </span>
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
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
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
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[9px] text-muted-foreground mt-1.5 text-center">
        Click providers to toggle · Double-click to solo · Snapshots saved every 5 min
      </div>
    </div>
  );
}
