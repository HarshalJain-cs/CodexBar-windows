import { Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ResetTimerProps {
    sessionResetsAt?: string;
    weeklyResetsAt?: string;
}

function formatTimeLeft(targetStr?: string): string {
    if (!targetStr) return '--:--';
    const target = new Date(targetStr).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return 'Now';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
}

export default function ResetTimer({ sessionResetsAt, weeklyResetsAt }: ResetTimerProps) {
    const [, setTick] = useState(0);

    // Update every minute
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
                <Clock size={9} />
                <span>Session resets: <span className="font-mono text-card-foreground">{formatTimeLeft(sessionResetsAt)}</span></span>
            </div>
            {weeklyResetsAt && (
                <>
                    <span className="text-border">·</span>
                    <div className="flex items-center gap-1">
                        <span>Weekly: <span className="font-mono text-card-foreground">{formatTimeLeft(weeklyResetsAt)}</span></span>
                    </div>
                </>
            )}
        </div>
    );
}
