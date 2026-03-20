import { Provider, ProviderId } from '@/types';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gauge, Trophy, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { providerLogos } from '@/data/providerLogos';

interface EfficiencyScoreProps {
  providers: Provider[];
  animationsEnabled?: boolean;
  privacyMode?: boolean;
}

interface ProviderScore {
  id: ProviderId;
  name: string;
  score: number;        // 0-100 composite
  availability: number; // how much headroom (100 - sessionPct)
  stability: number;    // status score
  trendScore: number;   // falling=good, rising=bad, steady=neutral
  rank: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

function statusToScore(status: string): number {
  switch (status) {
    case 'operational': return 100;
    case 'degraded': return 60;
    case 'outage': return 10;
    default: return 50;
  }
}

function trendToScore(direction: string): number {
  switch (direction) {
    case 'falling': return 90;  // Usage decreasing = more efficient
    case 'steady': return 70;
    case 'rising': return 40;   // Usage increasing = less headroom
    default: return 50;
  }
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

const GRADE_COLORS: Record<string, string> = {
  A: 'text-cb-success',
  B: 'text-primary',
  C: 'text-cb-warning',
  D: 'text-orange-500',
  F: 'text-cb-critical',
};

const GRADE_BG: Record<string, string> = {
  A: 'bg-cb-success/10 border-cb-success/20',
  B: 'bg-primary/10 border-primary/20',
  C: 'bg-cb-warning/10 border-cb-warning/20',
  D: 'bg-orange-500/10 border-orange-500/20',
  F: 'bg-cb-critical/10 border-cb-critical/20',
};

export default function EfficiencyScore({
  providers,
  animationsEnabled = true,
  privacyMode = false,
}: EfficiencyScoreProps) {
  const scores = useMemo((): ProviderScore[] => {
    const raw = providers.map(p => {
      const availability = 100 - p.usage.sessionPercent;
      const stability = statusToScore(p.statusInfo.status);
      const trendScore = trendToScore(p.usage.trend.direction);

      // Weighted composite: 40% availability, 35% stability, 25% trend
      const score = Math.round(
        availability * 0.40 + stability * 0.35 + trendScore * 0.25
      );

      return {
        id: p.id,
        name: p.name,
        score,
        availability: Math.round(availability),
        stability,
        trendScore,
        rank: 0,
        grade: scoreToGrade(score),
      };
    });

    // Assign ranks
    raw.sort((a, b) => b.score - a.score);
    raw.forEach((s, i) => { s.rank = i + 1; });

    return raw;
  }, [providers]);

  const avgScore = useMemo(
    () => Math.round(scores.reduce((s, sc) => s + sc.score, 0) / Math.max(scores.length, 1)),
    [scores]
  );

  if (scores.length === 0) return null;

  const topProvider = scores[0];

  return (
    <motion.div
      className="rounded-lg border border-border bg-card p-3"
      initial={animationsEnabled ? { opacity: 0, y: 8 } : undefined}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Gauge size={12} className="text-primary" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Efficiency Scores</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground">Avg:</span>
          <span className={`text-xs font-bold font-mono ${GRADE_COLORS[scoreToGrade(avgScore)]}`}>
            {privacyMode ? '••' : avgScore}
          </span>
        </div>
      </div>

      {/* Top provider highlight */}
      {!privacyMode && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-secondary/50">
          <Trophy size={14} className="text-cb-warning flex-shrink-0" />
          <img
            src={providerLogos[topProvider.id]}
            alt={topProvider.name}
            className="h-4 w-4 rounded-sm object-contain flex-shrink-0"
          />
          <span className="text-xs font-medium text-card-foreground">
            {topProvider.name}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">Most efficient</span>
          <span className={`text-sm font-bold font-mono ${GRADE_COLORS[topProvider.grade]}`}>
            {topProvider.grade}
          </span>
        </div>
      )}

      {/* Scores list */}
      <div className="space-y-1">
        {scores.map((entry, i) => {
          const trendIcon = entry.trendScore >= 80
            ? <ArrowDown size={9} className="text-cb-success" />
            : entry.trendScore <= 50
            ? <ArrowUp size={9} className="text-cb-warning" />
            : <Minus size={9} className="text-muted-foreground" />;

          return (
            <motion.div
              key={entry.id}
              initial={animationsEnabled ? { opacity: 0, x: -4 } : undefined}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-secondary/50 transition-colors"
            >
              <span className="text-[9px] font-mono text-muted-foreground w-3 text-right flex-shrink-0">
                #{entry.rank}
              </span>
              <img
                src={providerLogos[entry.id]}
                alt={entry.name}
                className="h-3.5 w-3.5 rounded-sm object-contain flex-shrink-0"
              />
              <span className="text-[11px] font-medium text-card-foreground flex-1 truncate min-w-0">
                {entry.name}
              </span>
              {trendIcon}
              {/* Score bar */}
              <div className="w-16 h-1.5 rounded-full bg-cb-bar-bg overflow-hidden flex-shrink-0">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${privacyMode ? 0 : entry.score}%`,
                    background: entry.score >= 70 ? 'hsl(var(--cb-success))' :
                      entry.score >= 50 ? 'hsl(var(--cb-warning))' : 'hsl(var(--cb-critical))',
                  }}
                />
              </div>
              <span className={`text-[10px] font-mono font-bold w-5 text-center flex-shrink-0 ${GRADE_COLORS[entry.grade]}`}>
                {privacyMode ? '•' : entry.grade}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground w-6 text-right flex-shrink-0">
                {privacyMode ? '••' : entry.score}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-2 text-[8px] text-muted-foreground text-center">
        Score = 40% availability + 35% uptime + 25% trend direction
      </div>
    </motion.div>
  );
}
