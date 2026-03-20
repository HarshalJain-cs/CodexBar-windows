import { Provider } from '@/types';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { providerLogos } from '@/data/providerLogos';

interface SmartInsightsProps {
  providers: Provider[];
  animationsEnabled?: boolean;
  privacyMode?: boolean;
}

type InsightSeverity = 'info' | 'warning' | 'success' | 'tip';

interface Insight {
  id: string;
  severity: InsightSeverity;
  icon: React.ReactNode;
  title: string;
  description: string;
  providerId?: string;
}

const SEVERITY_STYLES: Record<InsightSeverity, string> = {
  info: 'bg-primary/5 border-primary/20',
  warning: 'bg-cb-warning/5 border-cb-warning/20',
  success: 'bg-cb-success/5 border-cb-success/20',
  tip: 'bg-purple-500/5 border-purple-500/20',
};

const SEVERITY_ICON_STYLES: Record<InsightSeverity, string> = {
  info: 'text-primary',
  warning: 'text-cb-warning',
  success: 'text-cb-success',
  tip: 'text-purple-500',
};

export default function SmartInsights({
  providers,
  animationsEnabled = true,
  privacyMode = false,
}: SmartInsightsProps) {
  const insights = useMemo((): Insight[] => {
    if (providers.length === 0) return [];
    const results: Insight[] = [];

    // 1. Rapid usage spike detection
    providers.forEach(p => {
      if (p.usage.trend.direction === 'rising' && p.usage.trend.points.length >= 2) {
        const pts = p.usage.trend.points;
        const delta = pts[pts.length - 1].value - pts[0].value;
        const elapsedMins = (pts[pts.length - 1].timestamp - pts[0].timestamp) / 60000;
        if (delta > 20 && elapsedMins < 60) {
          results.push({
            id: `spike-${p.id}`,
            severity: 'warning',
            icon: <TrendingUp size={12} />,
            title: `${p.name} usage spiking`,
            description: `Usage increased ${Math.round(delta)}% in ${Math.round(elapsedMins)} minutes. Consider pacing your requests.`,
            providerId: p.id,
          });
        }
      }
    });

    // 2. Underutilized providers
    const underused = providers.filter(p => p.usage.sessionPercent < 5 && p.usage.weeklyPercent < 10);
    if (underused.length >= 2) {
      results.push({
        id: 'underused',
        severity: 'tip',
        icon: <Zap size={12} />,
        title: 'Underutilized providers',
        description: `${underused.map(p => p.name).join(', ')} have very low usage. Consider redistributing workload from high-usage providers.`,
      });
    }

    // 3. All providers healthy
    const allOperational = providers.every(p => p.statusInfo.status === 'operational');
    if (allOperational && providers.length > 2) {
      results.push({
        id: 'all-healthy',
        severity: 'success',
        icon: <CheckCircle size={12} />,
        title: 'All systems operational',
        description: `All ${providers.length} providers are reporting normal status.`,
      });
    }

    // 4. Provider with degraded/outage status
    providers.forEach(p => {
      if (p.statusInfo.status === 'outage') {
        results.push({
          id: `outage-${p.id}`,
          severity: 'warning',
          icon: <AlertTriangle size={12} />,
          title: `${p.name} experiencing outage`,
          description: `${p.statusInfo.description}. Usage data may be unreliable.`,
          providerId: p.id,
        });
      }
    });

    // 5. Usage balance analysis
    const sessionPcts = providers.map(p => p.usage.sessionPercent);
    const maxSession = Math.max(...sessionPcts);
    const minSession = Math.min(...sessionPcts);
    if (maxSession - minSession > 50 && providers.length >= 3) {
      const heaviest = providers.reduce((a, b) => a.usage.sessionPercent > b.usage.sessionPercent ? a : b);
      const lightest = providers.reduce((a, b) => a.usage.sessionPercent < b.usage.sessionPercent ? a : b);
      results.push({
        id: 'imbalance',
        severity: 'info',
        icon: <TrendingDown size={12} />,
        title: 'Usage imbalance detected',
        description: `${heaviest.name} (${heaviest.usage.sessionPercent}%) vs ${lightest.name} (${lightest.usage.sessionPercent}%). Balancing across providers can extend availability.`,
        providerId: heaviest.id,
      });
    }

    // 6. Weekend pattern (if current day is weekend and usage is high)
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) {
      const avgSession = providers.reduce((s, p) => s + p.usage.sessionPercent, 0) / providers.length;
      if (avgSession > 40) {
        results.push({
          id: 'weekend-usage',
          severity: 'info',
          icon: <Lightbulb size={12} />,
          title: 'Weekend usage is elevated',
          description: `Average session usage is ${Math.round(avgSession)}% on a weekend. Weekly limits typically reset Monday.`,
        });
      }
    }

    // 7. Near weekly limit
    const nearWeeklyLimit = providers.filter(p => p.usage.weeklyPercent >= 85);
    if (nearWeeklyLimit.length > 0) {
      results.push({
        id: 'near-weekly',
        severity: 'warning',
        icon: <AlertTriangle size={12} />,
        title: `${nearWeeklyLimit.length} provider${nearWeeklyLimit.length > 1 ? 's' : ''} near weekly limit`,
        description: `${nearWeeklyLimit.map(p => `${p.name} (${p.usage.weeklyPercent}%)`).join(', ')}. Consider switching to alternatives.`,
      });
    }

    return results.slice(0, 5); // Cap at 5 insights
  }, [providers]);

  if (insights.length === 0 || privacyMode) return null;

  return (
    <motion.div
      className="rounded-lg border border-border bg-card p-3"
      initial={animationsEnabled ? { opacity: 0, y: 8 } : undefined}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Lightbulb size={12} className="text-purple-500" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Smart Insights</span>
        <span className="text-[9px] text-muted-foreground ml-auto">{insights.length} insight{insights.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-1.5">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.id}
            initial={animationsEnabled ? { opacity: 0, x: -6 } : undefined}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`flex items-start gap-2 p-2 rounded-md border ${SEVERITY_STYLES[insight.severity]}`}
          >
            <div className={`flex-shrink-0 mt-0.5 ${SEVERITY_ICON_STYLES[insight.severity]}`}>
              {insight.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {insight.providerId && (
                  <img
                    src={providerLogos[insight.providerId as keyof typeof providerLogos]}
                    alt=""
                    className="h-3 w-3 rounded-sm object-contain flex-shrink-0"
                  />
                )}
                <span className="text-[11px] font-semibold text-card-foreground truncate">
                  {insight.title}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                {insight.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
