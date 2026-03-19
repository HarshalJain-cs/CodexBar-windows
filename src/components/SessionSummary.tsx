import { Provider } from '@/types';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, TrendingUp, BarChart3 } from 'lucide-react';

interface SessionSummaryProps {
    providers: Provider[];
    refreshLogCount: number;
    animationsEnabled?: boolean;
    privacyMode?: boolean;
}

export default function SessionSummary({
    providers,
    refreshLogCount,
    animationsEnabled = true,
    privacyMode = false,
}: SessionSummaryProps) {
    const stats = useMemo(() => {
        if (providers.length === 0) return null;

        const totalUsage = providers.reduce((s, p) => s + p.usage.sessionPercent, 0);
        const avgUsage = Math.round(totalUsage / providers.length);
        const peak = [...providers].sort((a, b) => b.usage.sessionPercent - a.usage.sessionPercent)[0];
        const rising = providers.filter(p => p.usage.trend.direction === 'rising').length;

        return { avgUsage, peak, rising, refreshLogCount };
    }, [providers, refreshLogCount]);

    if (!stats) return null;

    const cards = [
        {
            icon: <BarChart3 size={12} className="text-primary" />,
            label: 'Avg Usage',
            value: privacyMode ? '••' : `${stats.avgUsage}%`,
            color: 'text-primary',
        },
        {
            icon: <Zap size={12} className="text-cb-warning" />,
            label: 'Peak',
            value: privacyMode ? '••••' : stats.peak.name,
            color: 'text-cb-warning',
        },
        {
            icon: <TrendingUp size={12} className="text-cb-success" />,
            label: 'Rising',
            value: `${stats.rising}`,
            color: 'text-cb-success',
        },
        {
            icon: <Clock size={12} className="text-muted-foreground" />,
            label: 'Refreshes',
            value: `${stats.refreshLogCount}`,
            color: 'text-muted-foreground',
        },
    ];

    return (
        <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="text-xs font-semibold text-card-foreground mb-2">Today's Activity</h3>
            <div className="grid grid-cols-4 gap-2">
                {cards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={animationsEnabled ? { opacity: 0, y: 6 } : undefined}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="text-center"
                    >
                        <div className="flex justify-center mb-1">{card.icon}</div>
                        <div className={`text-sm font-bold font-mono ${card.color}`}>{card.value}</div>
                        <div className="text-[9px] text-muted-foreground">{card.label}</div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
