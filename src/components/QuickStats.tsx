import { Provider } from '@/types';
import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';

interface QuickStatsProps {
    providers: Provider[];
    privacyMode?: boolean;
}

export default function QuickStats({ providers, privacyMode = false }: QuickStatsProps) {
    if (providers.length === 0) return null;

    const avgSession = Math.round(
        providers.reduce((sum, p) => sum + p.usage.sessionPercent, 0) / providers.length
    );
    const worstProvider = [...providers].sort(
        (a, b) => b.usage.sessionPercent - a.usage.sessionPercent
    )[0];
    const criticalCount = providers.filter(
        p => p.statusInfo.status !== 'operational'
    ).length;

    return (
        <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border bg-card/80 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
                <Activity size={10} className="text-primary" />
                <span>{providers.length} providers</span>
            </div>
            <span className="text-border">·</span>
            <div className="flex items-center gap-1">
                <TrendingUp size={10} />
                <span>Avg: {privacyMode ? '••' : `${avgSession}%`}</span>
            </div>
            <span className="text-border">·</span>
            <div className="flex items-center gap-1 truncate">
                {criticalCount > 0 ? (
                    <>
                        <AlertTriangle size={10} className="text-cb-warning" />
                        <span className="text-cb-warning">{criticalCount} issue{criticalCount > 1 ? 's' : ''}</span>
                    </>
                ) : (
                    <>
                        <span className="h-1.5 w-1.5 rounded-full bg-cb-success" />
                        <span>Most used: {privacyMode ? '••••' : worstProvider.name}</span>
                    </>
                )}
            </div>
        </div>
    );
}
