import { Provider, ProviderId } from '@/types';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Info } from 'lucide-react';
import { providerLogos } from '@/data/providerLogos';

interface CostEstimationProps {
  providers: Provider[];
  animationsEnabled?: boolean;
  privacyMode?: boolean;
}

// Monthly pricing tiers per provider (approximate USD)
const PROVIDER_PRICING: Record<ProviderId, { plan: string; monthly: number; unit: string }> = {
  claude: { plan: 'Pro', monthly: 20, unit: 'messages' },
  codex: { plan: 'Plus', monthly: 20, unit: 'messages' },
  cursor: { plan: 'Pro', monthly: 20, unit: 'requests' },
  gemini: { plan: 'Advanced', monthly: 20, unit: 'queries' },
  copilot: { plan: 'Individual', monthly: 10, unit: 'completions' },
  windsurf: { plan: 'Pro', monthly: 15, unit: 'requests' },
  kiro: { plan: 'Pro', monthly: 19, unit: 'requests' },
  augment: { plan: 'Pro', monthly: 30, unit: 'requests' },
  devin: { plan: 'Team', monthly: 500, unit: 'ACUs' },
};

interface CostEntry {
  id: ProviderId;
  name: string;
  plan: string;
  monthly: number;
  dailyBurn: number;
  weeklyBurn: number;
  projectedMonthly: number;
  efficiency: number; // cost per % of usage
}

export default function CostEstimation({
  providers,
  animationsEnabled = true,
  privacyMode = false,
}: CostEstimationProps) {
  const costs = useMemo((): CostEntry[] => {
    return providers.map(p => {
      const pricing = PROVIDER_PRICING[p.id];
      if (!pricing) return null;

      const dailyUsagePct = p.usage.sessionPercent;
      const weeklyUsagePct = p.usage.weeklyPercent;

      // Estimate daily cost based on session usage as proportion of monthly
      const dailyBurn = (dailyUsagePct / 100) * (pricing.monthly / 30);
      const weeklyBurn = (weeklyUsagePct / 100) * (pricing.monthly / 4);
      const projectedMonthly = dailyBurn * 30;
      const efficiency = dailyUsagePct > 0 ? pricing.monthly / dailyUsagePct : 0;

      return {
        id: p.id,
        name: p.name,
        plan: pricing.plan,
        monthly: pricing.monthly,
        dailyBurn: Math.round(dailyBurn * 100) / 100,
        weeklyBurn: Math.round(weeklyBurn * 100) / 100,
        projectedMonthly: Math.round(projectedMonthly * 100) / 100,
        efficiency: Math.round(efficiency * 100) / 100,
      } as CostEntry;
    }).filter((c): c is CostEntry => c !== null);
  }, [providers]);

  const totalMonthly = useMemo(
    () => costs.reduce((s, c) => s + c.monthly, 0),
    [costs]
  );

  const totalProjected = useMemo(
    () => Math.round(costs.reduce((s, c) => s + c.projectedMonthly, 0) * 100) / 100,
    [costs]
  );

  const totalDailyBurn = useMemo(
    () => Math.round(costs.reduce((s, c) => s + c.dailyBurn, 0) * 100) / 100,
    [costs]
  );

  if (costs.length === 0) return null;

  return (
    <motion.div
      className="rounded-lg border border-border bg-card p-3"
      initial={animationsEnabled ? { opacity: 0, y: 8 } : undefined}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <DollarSign size={12} className="text-cb-success" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Cost Estimation</span>
        <div className="group relative ml-auto">
          <Info size={10} className="text-muted-foreground cursor-help" />
          <div className="hidden group-hover:block absolute right-0 top-4 z-20 w-48 p-2 rounded-md bg-popover border border-border text-[9px] text-muted-foreground shadow-lg">
            Estimates based on listed plan prices and current usage rates. Actual costs may vary by plan and usage patterns.
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-secondary/50 rounded-md p-2 text-center">
          <div className="text-sm font-bold font-mono text-card-foreground">
            {privacyMode ? '••' : `$${totalMonthly}`}
          </div>
          <div className="text-[8px] text-muted-foreground">Plans/mo</div>
        </div>
        <div className="bg-secondary/50 rounded-md p-2 text-center">
          <div className="text-sm font-bold font-mono text-card-foreground">
            {privacyMode ? '••' : `$${totalDailyBurn}`}
          </div>
          <div className="text-[8px] text-muted-foreground">Today</div>
        </div>
        <div className="bg-secondary/50 rounded-md p-2 text-center">
          <div className={`text-sm font-bold font-mono ${totalProjected > totalMonthly ? 'text-cb-warning' : 'text-cb-success'}`}>
            {privacyMode ? '••' : `$${totalProjected}`}
          </div>
          <div className="text-[8px] text-muted-foreground">Projected</div>
        </div>
      </div>

      {/* Per-provider breakdown */}
      <div className="space-y-1">
        {costs.sort((a, b) => b.dailyBurn - a.dailyBurn).map((cost, i) => (
          <motion.div
            key={cost.id}
            initial={animationsEnabled ? { opacity: 0, x: -6 } : undefined}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-2 text-[11px] px-2 py-1 rounded-md hover:bg-secondary/50 transition-colors"
          >
            <img
              src={providerLogos[cost.id]}
              alt={cost.name}
              className="h-3.5 w-3.5 rounded-sm object-contain flex-shrink-0"
            />
            <span className="text-card-foreground font-medium flex-1 truncate min-w-0">
              {cost.name}
            </span>
            <span className="text-[9px] text-muted-foreground flex-shrink-0">
              {cost.plan}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <TrendingUp size={8} className="text-muted-foreground" />
              <span className="font-mono text-[10px] text-muted-foreground w-12 text-right">
                {privacyMode ? '••' : `$${cost.dailyBurn}/d`}
              </span>
            </div>
            <span className={`font-mono font-semibold text-[10px] w-14 text-right flex-shrink-0 ${
              cost.projectedMonthly > cost.monthly ? 'text-cb-warning' : 'text-card-foreground'
            }`}>
              {privacyMode ? '••' : `$${cost.monthly}/mo`}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
