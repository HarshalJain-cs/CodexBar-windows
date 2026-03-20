import { Provider, ProviderId } from '@/types';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Settings2, Check, X, AlertTriangle } from 'lucide-react';
import { providerLogos } from '@/data/providerLogos';

interface UsageBudgetProps {
  providers: Provider[];
  animationsEnabled?: boolean;
  privacyMode?: boolean;
}

interface Budget {
  dailyLimit: number;  // Max session % per day
  weeklyLimit: number; // Max weekly % per week
}

const BUDGET_STORAGE_KEY = 'cb-usage-budgets';

function loadBudgets(): Record<string, Budget> {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveBudgets(budgets: Record<string, Budget>) {
  try { localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets)); } catch { /* ok */ }
}

interface BudgetStatus {
  providerId: ProviderId;
  providerName: string;
  dailyUsed: number;
  dailyLimit: number;
  weeklyUsed: number;
  weeklyLimit: number;
  dailyPct: number;
  weeklyPct: number;
  isOverDaily: boolean;
  isOverWeekly: boolean;
}

export default function UsageBudget({
  providers,
  animationsEnabled = true,
  privacyMode = false,
}: UsageBudgetProps) {
  const [budgets, setBudgets] = useState<Record<string, Budget>>(loadBudgets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDaily, setEditDaily] = useState(80);
  const [editWeekly, setEditWeekly] = useState(80);
  const [showConfig, setShowConfig] = useState(false);

  // Persist budgets
  useEffect(() => { saveBudgets(budgets); }, [budgets]);

  const setBudget = useCallback((id: string, budget: Budget) => {
    setBudgets(prev => ({ ...prev, [id]: budget }));
    setEditingId(null);
  }, []);

  const removeBudget = useCallback((id: string) => {
    setBudgets(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const startEdit = useCallback((id: string) => {
    const existing = budgets[id];
    setEditDaily(existing?.dailyLimit ?? 80);
    setEditWeekly(existing?.weeklyLimit ?? 80);
    setEditingId(id);
  }, [budgets]);

  const budgetStatuses = useMemo((): BudgetStatus[] => {
    return providers
      .filter(p => budgets[p.id])
      .map(p => {
        const budget = budgets[p.id];
        const dailyPct = budget.dailyLimit > 0 ? (p.usage.sessionPercent / budget.dailyLimit) * 100 : 0;
        const weeklyPct = budget.weeklyLimit > 0 ? (p.usage.weeklyPercent / budget.weeklyLimit) * 100 : 0;
        return {
          providerId: p.id,
          providerName: p.name,
          dailyUsed: p.usage.sessionPercent,
          dailyLimit: budget.dailyLimit,
          weeklyUsed: p.usage.weeklyPercent,
          weeklyLimit: budget.weeklyLimit,
          dailyPct: Math.min(dailyPct, 100),
          weeklyPct: Math.min(weeklyPct, 100),
          isOverDaily: p.usage.sessionPercent >= budget.dailyLimit,
          isOverWeekly: p.usage.weeklyPercent >= budget.weeklyLimit,
        };
      })
      .sort((a, b) => Math.max(b.dailyPct, b.weeklyPct) - Math.max(a.dailyPct, a.weeklyPct));
  }, [providers, budgets]);

  const overBudgetCount = useMemo(
    () => budgetStatuses.filter(s => s.isOverDaily || s.isOverWeekly).length,
    [budgetStatuses]
  );

  const hasBudgets = Object.keys(budgets).length > 0;

  return (
    <motion.div
      className="rounded-lg border border-border bg-card p-3"
      initial={animationsEnabled ? { opacity: 0, y: 8 } : undefined}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Wallet size={12} className="text-primary" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Usage Budgets</span>
        {overBudgetCount > 0 && (
          <span className="flex items-center gap-0.5 text-[9px] text-cb-critical font-medium">
            <AlertTriangle size={9} /> {overBudgetCount} over
          </span>
        )}
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="ml-auto p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Configure budgets"
        >
          <Settings2 size={11} />
        </button>
      </div>

      {/* Budget config panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-3 space-y-1 border-b border-border pb-3">
              <div className="text-[10px] text-muted-foreground mb-1.5">Set daily/weekly usage limits per provider:</div>
              {providers.map(p => {
                const hasBudget = !!budgets[p.id];
                const isEditing = editingId === p.id;

                return (
                  <div key={p.id} className="flex items-center gap-2 text-[11px]">
                    <img src={providerLogos[p.id]} alt={p.name} className="h-3.5 w-3.5 rounded-sm object-contain flex-shrink-0" />
                    <span className="text-card-foreground w-16 truncate">{p.name}</span>

                    {isEditing ? (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground">D:</span>
                          <input
                            type="number"
                            min={10}
                            max={100}
                            value={editDaily}
                            onChange={e => setEditDaily(Number(e.target.value))}
                            className="w-10 h-5 text-[10px] text-center rounded border border-border bg-background text-foreground"
                          />
                          <span className="text-[9px] text-muted-foreground">W:</span>
                          <input
                            type="number"
                            min={10}
                            max={100}
                            value={editWeekly}
                            onChange={e => setEditWeekly(Number(e.target.value))}
                            className="w-10 h-5 text-[10px] text-center rounded border border-border bg-background text-foreground"
                          />
                        </div>
                        <button
                          onClick={() => setBudget(p.id, { dailyLimit: editDaily, weeklyLimit: editWeekly })}
                          className="p-0.5 rounded text-cb-success hover:bg-cb-success/10"
                        >
                          <Check size={10} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-0.5 rounded text-muted-foreground hover:bg-secondary"
                        >
                          <X size={10} />
                        </button>
                      </>
                    ) : (
                      <>
                        {hasBudget ? (
                          <span className="text-[9px] font-mono text-muted-foreground flex-1">
                            D:{budgets[p.id].dailyLimit}% W:{budgets[p.id].weeklyLimit}%
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground flex-1">No budget</span>
                        )}
                        <button
                          onClick={() => startEdit(p.id)}
                          className="text-[9px] text-primary hover:underline"
                        >
                          {hasBudget ? 'Edit' : 'Set'}
                        </button>
                        {hasBudget && (
                          <button
                            onClick={() => removeBudget(p.id)}
                            className="text-[9px] text-muted-foreground hover:text-cb-critical"
                          >
                            Remove
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget status */}
      {hasBudgets && budgetStatuses.length > 0 ? (
        <div className="space-y-2">
          {budgetStatuses.map((status, i) => (
            <motion.div
              key={status.providerId}
              initial={animationsEnabled ? { opacity: 0, x: -4 } : undefined}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <img
                  src={providerLogos[status.providerId]}
                  alt={status.providerName}
                  className="h-3 w-3 rounded-sm object-contain flex-shrink-0"
                />
                <span className="text-[11px] font-medium text-card-foreground flex-1 truncate">
                  {status.providerName}
                </span>
                {(status.isOverDaily || status.isOverWeekly) && (
                  <AlertTriangle size={9} className="text-cb-critical flex-shrink-0" />
                )}
              </div>
              {/* Daily budget bar */}
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-muted-foreground w-3">D</span>
                <div className="flex-1 h-1.5 rounded-full bg-cb-bar-bg overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      status.isOverDaily ? 'bg-cb-critical' :
                      status.dailyPct > 80 ? 'bg-cb-warning' : 'bg-cb-bar-session'
                    }`}
                    style={{ width: `${status.dailyPct}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground w-16 text-right">
                  {privacyMode ? '••' : `${status.dailyUsed}/${status.dailyLimit}%`}
                </span>
              </div>
              {/* Weekly budget bar */}
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-muted-foreground w-3">W</span>
                <div className="flex-1 h-1.5 rounded-full bg-cb-bar-bg overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      status.isOverWeekly ? 'bg-cb-critical' :
                      status.weeklyPct > 80 ? 'bg-cb-warning' : 'bg-cb-bar-weekly'
                    }`}
                    style={{ width: `${status.weeklyPct}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground w-16 text-right">
                  {privacyMode ? '••' : `${status.weeklyUsed}/${status.weeklyLimit}%`}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : !hasBudgets ? (
        <div className="text-center py-2 text-[10px] text-muted-foreground">
          No budgets configured. Click the gear icon to set limits.
        </div>
      ) : null}
    </motion.div>
  );
}
