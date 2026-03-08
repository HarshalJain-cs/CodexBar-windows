import { Provider } from '@/types';
import { providerLogos } from '@/data/providerLogos';
import { Flame, TrendingUp, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DashboardWidgetsProps {
  providers: Provider[];
  animationsEnabled?: boolean;
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

export default function DashboardWidgets({ providers, animationsEnabled = true }: DashboardWidgetsProps) {
  // Total daily spend (mock: sum of session percentages as "tokens")
  const totalDailyTokens = providers.reduce((sum, p) => sum + Math.round(p.usage.sessionPercent * 12.5), 0);
  
  // Streak: mock consecutive days
  const streak = 7;

  // Comparison data
  const comparisonData = providers
    .map(p => ({
      name: p.name,
      id: p.id,
      session: p.usage.sessionPercent,
      weekly: p.usage.weeklyPercent,
    }))
    .sort((a, b) => b.session - a.session);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="grid grid-cols-2 gap-2.5"
      variants={animationsEnabled ? container : undefined}
      initial={animationsEnabled ? 'hidden' : undefined}
      animate={animationsEnabled ? 'show' : undefined}
    >
      {/* Total Daily Tokens */}
      <motion.div
        variants={animationsEnabled ? item : undefined}
        className="rounded-lg border border-border bg-card p-3"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={12} className="text-primary" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Daily Tokens</span>
        </div>
        <div className="text-xl font-bold text-card-foreground cb-mono">
          {totalDailyTokens.toLocaleString()}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">across {providers.length} providers</div>
      </motion.div>

      {/* Usage Streak */}
      <motion.div
        variants={animationsEnabled ? item : undefined}
        className="rounded-lg border border-border bg-card p-3"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Flame size={12} className="text-cb-warning" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Streak</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-card-foreground cb-mono">{streak}</span>
          <span className="text-[10px] text-muted-foreground">days</span>
        </div>
        <div className="flex gap-0.5 mt-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < streak ? 'bg-cb-warning' : 'bg-cb-bar-bg'
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Provider Comparison Chart */}
      <motion.div
        variants={animationsEnabled ? item : undefined}
        className="col-span-2 rounded-lg border border-border bg-card p-3"
      >
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart3 size={12} className="text-primary" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Provider Comparison</span>
        </div>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
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
                formatter={(value: number) => [`${value}%`, 'Session']}
              />
              <Bar dataKey="session" radius={[4, 4, 0, 0]} isAnimationActive={animationsEnabled}>
                {comparisonData.map((entry) => (
                  <Cell key={entry.id} fill={CHART_COLORS[entry.id] || 'hsl(var(--primary))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
