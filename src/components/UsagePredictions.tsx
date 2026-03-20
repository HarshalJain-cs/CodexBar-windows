import { Provider } from '@/types';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { providerLogos } from '@/data/providerLogos';

interface UsagePredictionsProps {
  providers: Provider[];
  animationsEnabled?: boolean;
  privacyMode?: boolean;
}

interface Prediction {
  providerId: string;
  providerName: string;
  currentUsage: number;
  ratePerHour: number;
  hoursLeft: number;
  severity: 'ok' | 'warning' | 'critical';
}

export default function UsagePredictions({
  providers,
  animationsEnabled = true,
  privacyMode = false,
}: UsagePredictionsProps) {
  const predictions = useMemo((): Prediction[] => {
    return providers
      .filter(p => p.usage.trend.direction === 'rising' && p.usage.trend.points.length >= 2)
      .map(p => {
        const pts = p.usage.trend.points;
        const first = pts[0];
        const last = pts[pts.length - 1];
        const elapsedHours = (last.timestamp - first.timestamp) / 3600000;
        const delta = last.value - first.value;

        if (delta <= 0 || elapsedHours <= 0) return null;

        const ratePerHour = delta / elapsedHours;
        const remaining = 100 - p.usage.sessionPercent;
        const hoursLeft = remaining / ratePerHour;

        return {
          providerId: p.id,
          providerName: p.name,
          currentUsage: p.usage.sessionPercent,
          ratePerHour: Math.round(ratePerHour * 10) / 10,
          hoursLeft: Math.round(hoursLeft * 10) / 10,
          severity: hoursLeft < 1 ? 'critical' : hoursLeft < 4 ? 'warning' : 'ok',
        } as Prediction;
      })
      .filter((p): p is Prediction => p !== null)
      .sort((a, b) => a.hoursLeft - b.hoursLeft);
  }, [providers]);

  if (predictions.length === 0) return null;

  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <motion.div
      className="rounded-lg border border-border bg-card p-3"
      initial={animationsEnabled ? { opacity: 0, y: 8 } : undefined}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Clock size={12} className="text-primary" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Burndown Predictions</span>
      </div>
      <div className="space-y-1.5">
        {predictions.map((pred, i) => (
          <motion.div
            key={pred.providerId}
            initial={animationsEnabled ? { opacity: 0, x: -8 } : undefined}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md ${
              pred.severity === 'critical'
                ? 'bg-cb-critical/10 border border-cb-critical/20'
                : pred.severity === 'warning'
                ? 'bg-cb-warning/10 border border-cb-warning/20'
                : 'bg-secondary/50'
            }`}
          >
            <img
              src={providerLogos[pred.providerId as keyof typeof providerLogos]}
              alt={pred.providerName}
              className="h-4 w-4 rounded-sm object-contain flex-shrink-0"
            />
            <span className="font-medium text-card-foreground flex-1 min-w-0 truncate">
              {pred.providerName}
            </span>
            {pred.severity === 'critical' && <AlertTriangle size={10} className="text-cb-critical flex-shrink-0" />}
            {pred.severity === 'warning' && <AlertTriangle size={10} className="text-cb-warning flex-shrink-0" />}
            <div className="flex items-center gap-1 flex-shrink-0">
              <TrendingUp size={10} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-mono">
                {privacyMode ? '••' : `${pred.ratePerHour}%/h`}
              </span>
            </div>
            <span className={`font-mono font-semibold text-[11px] flex-shrink-0 ${
              pred.severity === 'critical' ? 'text-cb-critical' :
              pred.severity === 'warning' ? 'text-cb-warning' :
              'text-card-foreground'
            }`}>
              {privacyMode ? '••' : formatTime(pred.hoursLeft)}
            </span>
          </motion.div>
        ))}
      </div>
      {predictions.length > 0 && !privacyMode && (
        <div className="mt-2 text-[9px] text-muted-foreground text-center">
          Based on current usage rate. Actual limits may vary.
        </div>
      )}
    </motion.div>
  );
}
