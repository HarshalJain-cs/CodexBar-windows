import { Provider } from '@/types';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, BarChart3 } from 'lucide-react';
import { providerLogos } from '@/data/providerLogos';

interface WeeklySummaryProps {
  providers: Provider[];
  animationsEnabled?: boolean;
  privacyMode?: boolean;
}

export default function WeeklySummary({
  providers,
  animationsEnabled = true,
  privacyMode = false,
}: WeeklySummaryProps) {
  const summary = useMemo(() => {
    if (providers.length === 0) return null;

    const avgWeekly = Math.round(
      providers.reduce((s, p) => s + p.usage.weeklyPercent, 0) / providers.length
    );
    const avgSession = Math.round(
      providers.reduce((s, p) => s + p.usage.sessionPercent, 0) / providers.length
    );

    // Provider with most weekly usage
    const mostUsedWeekly = [...providers].sort(
      (a, b) => b.usage.weeklyPercent - a.usage.weeklyPercent
    )[0];

    // Provider with least weekly usage
    const leastUsedWeekly = [...providers].sort(
      (a, b) => a.usage.weeklyPercent - b.usage.weeklyPercent
    )[0];

    // Providers nearing weekly limit (>80%)
    const nearingLimit = providers.filter(p => p.usage.weeklyPercent >= 80);

    // Weekly vs session comparison (how much more weekly than session)
    const weeklyToSessionRatio = avgSession > 0 ? (avgWeekly / avgSession).toFixed(1) : '0';

    return {
      avgWeekly,
      avgSession,
      mostUsedWeekly,
      leastUsedWeekly,
      nearingLimit,
      weeklyToSessionRatio,
      totalProviders: providers.length,
    };
  }, [providers]);

  if (!summary) return null;

  return (
    <motion.div
      className="rounded-lg border border-border bg-card p-3"
      initial={animationsEnabled ? { opacity: 0, y: 8 } : undefined}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Calendar size={12} className="text-primary" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Weekly Summary</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-secondary/50 rounded-md p-2 text-center">
          <div className="text-lg font-bold font-mono text-card-foreground">
            {privacyMode ? '••' : `${summary.avgSession}%`}
          </div>
          <div className="text-[9px] text-muted-foreground">Avg Session</div>
        </div>
        <div className="bg-secondary/50 rounded-md p-2 text-center">
          <div className="text-lg font-bold font-mono text-card-foreground">
            {privacyMode ? '••' : `${summary.avgWeekly}%`}
          </div>
          <div className="text-[9px] text-muted-foreground">Avg Weekly</div>
        </div>
      </div>

      {/* Most / Least used */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <BarChart3 size={10} className="text-cb-warning flex-shrink-0" />
          <span className="text-muted-foreground">Most used:</span>
          <img
            src={providerLogos[summary.mostUsedWeekly.id]}
            alt={summary.mostUsedWeekly.name}
            className="h-3.5 w-3.5 rounded-sm object-contain"
          />
          <span className="font-medium text-card-foreground">
            {privacyMode ? '••••' : summary.mostUsedWeekly.name}
          </span>
          <span className="font-mono text-muted-foreground ml-auto">
            {privacyMode ? '••' : `${summary.mostUsedWeekly.usage.weeklyPercent}%`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <BarChart3 size={10} className="text-cb-success flex-shrink-0" />
          <span className="text-muted-foreground">Least used:</span>
          <img
            src={providerLogos[summary.leastUsedWeekly.id]}
            alt={summary.leastUsedWeekly.name}
            className="h-3.5 w-3.5 rounded-sm object-contain"
          />
          <span className="font-medium text-card-foreground">
            {privacyMode ? '••••' : summary.leastUsedWeekly.name}
          </span>
          <span className="font-mono text-muted-foreground ml-auto">
            {privacyMode ? '••' : `${summary.leastUsedWeekly.usage.weeklyPercent}%`}
          </span>
        </div>
      </div>

      {/* Nearing limit warning */}
      {summary.nearingLimit.length > 0 && (
        <div className="mt-2 px-2 py-1.5 rounded-md bg-cb-warning/10 border border-cb-warning/20">
          <div className="text-[10px] text-cb-warning font-medium">
            {summary.nearingLimit.length} provider{summary.nearingLimit.length > 1 ? 's' : ''} nearing weekly limit ({'>'}80%)
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            {privacyMode
              ? '•••'
              : summary.nearingLimit.map(p => p.name).join(', ')}
          </div>
        </div>
      )}
    </motion.div>
  );
}
