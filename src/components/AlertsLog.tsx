import { AlertLogEntry } from '@/types';
import { Bell, X, Trash2 } from 'lucide-react';
import { providerLogos } from '@/data/providerLogos';

interface AlertsLogProps {
    alerts: AlertLogEntry[];
    onClear: () => void;
    onClose: () => void;
}

function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertsLog({ alerts, onClear, onClose }: AlertsLogProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-sm max-h-[85vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col m-3">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Bell size={14} className="text-primary" />
                        <span className="text-sm font-semibold text-card-foreground">Alerts History</span>
                        {alerts.length > 0 && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                                {alerts.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {alerts.length > 0 && (
                            <button
                                onClick={onClear}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                aria-label="Clear all alerts"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            aria-label="Close alerts"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Alerts list */}
                <div className="flex-1 cb-scroll-area p-3 space-y-2">
                    {alerts.length === 0 ? (
                        <div className="text-center py-8">
                            <Bell size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                            <div className="text-xs text-muted-foreground">No alerts yet</div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                                Alerts appear when usage crosses your thresholds
                            </div>
                        </div>
                    ) : (
                        alerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`rounded-lg border p-2.5 ${alert.type === 'critical'
                                        ? 'border-cb-critical/20 bg-cb-critical/5'
                                        : 'border-cb-warning/20 bg-cb-warning/5'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <img
                                        src={providerLogos[alert.providerId]}
                                        alt={alert.providerName}
                                        className="h-4 w-4 rounded-sm object-contain"
                                    />
                                    <span className="text-xs font-medium text-card-foreground flex-1">
                                        {alert.providerName}
                                    </span>
                                    <span
                                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${alert.type === 'critical'
                                                ? 'bg-cb-critical/15 text-cb-critical'
                                                : 'bg-cb-warning/15 text-cb-warning'
                                            }`}
                                    >
                                        {alert.type === 'critical' ? 'CRITICAL' : 'WARNING'}
                                    </span>
                                </div>
                                <div className="mt-1 text-[10px] text-muted-foreground">{alert.message}</div>
                                <div className="mt-1 text-[9px] text-muted-foreground">{timeAgo(alert.timestamp)}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
