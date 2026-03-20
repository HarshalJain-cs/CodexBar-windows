import { Provider, ProviderId } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Clock, BarChart3, Shield } from 'lucide-react';
import { providerLogos } from '@/data/providerLogos';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell,
} from 'recharts';

interface ProviderDeepDiveProps {
  provider: Provider | null;
  onClose: () => void;
  onRefresh: (id: string) => void;
  animationsEnabled?: boolean;
  privacyMode?: boolean;
  warningThreshold?: number;
  criticalThreshold?: number;
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

function generateDetailedHistory(provider: Provider): { time: string; value: number }[] {
  const pts = provider.usage.trend.points;
  if (pts.length >= 3) {
    return pts.map(p => ({
      time: new Date(p.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(p.value),
    }));
  }
  // Generate 12 synthetic points
  return Array.from({ length: 12 }, (_, i) => {
    const base = provider.usage.sessionPercent;
    const jitter = Math.round((Math.random() - 0.3) * 15);
    return {
      time: new Date(Date.now() - (11 - i) * 600000).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
      value: Math.max(0, Math.min(100, base - (11 - i) * 2 + jitter)),
    };
  });
}

export default function ProviderDeepDive({
  provider,
  onClose,
  onRefresh,
  animationsEnabled = true,
  privacyMode = false,
  warningThreshold = 30,
  criticalThreshold = 10,
}: ProviderDeepDiveProps) {
  if (!provider) return null;

  const color = CHART_COLORS[provider.id] || 'hsl(var(--primary))';
  const sessionRemaining = 100 - provider.usage.sessionPercent;
  const weeklyRemaining = 100 - provider.usage.weeklyPercent;
  const historyData = generateDetailedHistory(provider);

  const trendIcon = provider.usage.trend.direction === 'rising'
    ? <TrendingUp size={14} className="text-cb-warning" />
    : provider.usage.trend.direction === 'falling'
    ? <TrendingDown size={14} className="text-cb-success" />
    : <Minus size={14} className="text-muted-foreground" />;

  const usageBars = [
    { label: 'Session', value: provider.usage.sessionPercent, remaining: sessionRemaining },
    { label: 'Weekly', value: provider.usage.weeklyPercent, remaining: weeklyRemaining },
  ];

  // Rate calculation
  let rateLabel = '';
  const pts = provider.usage.trend.points;
  if (pts.length >= 2) {
    const delta = pts[pts.length - 1].value - pts[0].value;
    const elapsedH = (pts[pts.length - 1].timestamp - pts[0].timestamp) / 3600000;
    if (elapsedH > 0) {
      rateLabel = `${delta > 0 ? '+' : ''}${(delta / elapsedH).toFixed(1)}%/hr`;
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card border border-border rounded-xl shadow-2xl w-[420px] max-h-[85vh] overflow-y-auto cb-scroll-area"
          initial={animationsEnabled ? { scale: 0.92, opacity: 0, y: 20 } : undefined}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={animationsEnabled ? { scale: 0.92, opacity: 0, y: 20 } : undefined}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <img
              src={providerLogos[provider.id]}
              alt={provider.name}
              className="h-8 w-8 rounded-lg object-contain"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-card-foreground">{provider.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${
                  provider.statusInfo.status === 'operational' ? 'bg-cb-success' :
                  provider.statusInfo.status === 'degraded' ? 'bg-cb-warning' :
                  provider.statusInfo.status === 'outage' ? 'bg-cb-critical' : 'bg-cb-steady'
                }`} />
                <span className="text-[10px] text-muted-foreground capitalize">
                  {provider.statusInfo.status}
                </span>
                {trendIcon}
                {rateLabel && (
                  <span className="text-[10px] font-mono text-muted-foreground">{rateLabel}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRefresh(provider.id)}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Refresh provider"
              >
                <RefreshCw size={14} />
              </button>
              {provider.statusInfo.statusPageUrl && (
                <button
                  onClick={() => window.open(provider.statusInfo.statusPageUrl, '_blank')}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Open status page"
                >
                  <ExternalLink size={14} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Usage meters */}
            <div className="space-y-3">
              {usageBars.map(bar => {
                const remaining = bar.remaining;
                const level = remaining <= criticalThreshold ? 'critical' :
                  remaining <= warningThreshold ? 'warning' : 'normal';
                return (
                  <div key={bar.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-card-foreground">{bar.label}</span>
                      <span className={`text-sm font-mono font-bold ${
                        level === 'critical' ? 'text-cb-critical' :
                        level === 'warning' ? 'text-cb-warning' : 'text-card-foreground'
                      }`}>
                        {privacyMode ? '••' : `${bar.value}%`}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-cb-bar-bg overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${bar.value}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-muted-foreground">
                        {privacyMode ? '••' : `${remaining}% remaining`}
                      </span>
                      {bar.label === 'Session' && provider.usage.sessionResetsAt && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <Clock size={8} />
                          Resets {new Date(provider.usage.sessionResetsAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trend chart */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 size={11} className="text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Usage Trend</span>
              </div>
              <div className="h-[120px] rounded-lg bg-secondary/30 p-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id={`dd-gradient-${provider.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: 'hsl(var(--card-foreground))',
                      }}
                      formatter={(v: number) => [privacyMode ? '••' : `${v}%`, 'Usage']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={2}
                      fill={`url(#dd-gradient-${provider.id})`}
                      isAnimationActive={animationsEnabled}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-secondary/50 rounded-md p-2 text-center">
                <div className="text-[9px] text-muted-foreground mb-0.5">Auth</div>
                <div className="flex items-center justify-center gap-1">
                  <Shield size={10} className={
                    provider.authStatus === 'authenticated' ? 'text-cb-success' :
                    provider.authStatus === 'expired' ? 'text-cb-warning' : 'text-cb-steady'
                  } />
                  <span className="text-[10px] font-medium text-card-foreground capitalize">
                    {provider.authStatus === 'not_configured' ? 'N/A' : provider.authStatus}
                  </span>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-md p-2 text-center">
                <div className="text-[9px] text-muted-foreground mb-0.5">Trend</div>
                <div className="flex items-center justify-center gap-1">
                  {trendIcon}
                  <span className="text-[10px] font-medium text-card-foreground capitalize">
                    {provider.usage.trend.direction}
                  </span>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-md p-2 text-center">
                <div className="text-[9px] text-muted-foreground mb-0.5">Points</div>
                <span className="text-sm font-bold font-mono text-card-foreground">
                  {provider.usage.trend.points.length}
                </span>
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Session</span>
                <span className="font-mono text-card-foreground">{privacyMode ? '••••' : provider.usage.sessionLabel}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Weekly</span>
                <span className="font-mono text-card-foreground">{privacyMode ? '••••' : provider.usage.weeklyLabel}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last checked</span>
                <span className="font-mono text-card-foreground">
                  {new Date(provider.statusInfo.lastChecked).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
