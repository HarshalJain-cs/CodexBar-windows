import { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';

interface NotificationBannerProps {
  type: 'warning' | 'critical';
  providerName: string;
  message: string;
  onDismiss: () => void;
}

export default function NotificationBanner({ type, providerName, message, onDismiss }: NotificationBannerProps) {
  return (
    <div
      className={`cb-notification-slide-in flex items-center gap-2 px-3 py-2 text-xs font-medium ${
        type === 'critical'
          ? 'bg-cb-critical/15 text-cb-critical'
          : 'bg-cb-warning/15 text-cb-warning'
      }`}
    >
      {type === 'critical' ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
      <span className="flex-1 min-w-0 truncate">
        <span className="font-semibold">{providerName}</span>: {message}
      </span>
      <button onClick={onDismiss} className="p-0.5 hover:opacity-70 transition-opacity flex-shrink-0" aria-label="Dismiss notification">
        <X size={12} />
      </button>
    </div>
  );
}

// Hook to check thresholds and generate notifications
export function useNotifications(
  providers: { name: string; usage: { sessionPercent: number; weeklyPercent: number } }[],
  warningThreshold: number,
  criticalThreshold: number
) {
  const [notifications, setNotifications] = useState<
    { id: string; type: 'warning' | 'critical'; providerName: string; message: string }[]
  >([]);

  // Serialize provider usage to avoid infinite loop from new array refs
  const providerKey = useMemo(
    () => providers.map(p => `${p.name}:${p.usage.sessionPercent}:${p.usage.weeklyPercent}`).join(','),
    [providers]
  );

  useEffect(() => {
    const newNotifs: typeof notifications = [];
    providers.forEach(p => {
      const sessionRemaining = 100 - p.usage.sessionPercent;
      const weeklyRemaining = 100 - p.usage.weeklyPercent;

      if (sessionRemaining <= criticalThreshold) {
        newNotifs.push({
          id: `${p.name}-session-critical`,
          type: 'critical',
          providerName: p.name,
          message: `Only ${sessionRemaining}% session remaining!`,
        });
      } else if (sessionRemaining <= warningThreshold) {
        newNotifs.push({
          id: `${p.name}-session-warning`,
          type: 'warning',
          providerName: p.name,
          message: `${sessionRemaining}% session remaining`,
        });
      }

      if (weeklyRemaining <= criticalThreshold) {
        newNotifs.push({
          id: `${p.name}-weekly-critical`,
          type: 'critical',
          providerName: p.name,
          message: `Only ${weeklyRemaining}% weekly remaining!`,
        });
      } else if (weeklyRemaining <= warningThreshold) {
        newNotifs.push({
          id: `${p.name}-weekly-warning`,
          type: 'warning',
          providerName: p.name,
          message: `${weeklyRemaining}% weekly remaining`,
        });
      }
    });
    setNotifications(newNotifs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerKey, warningThreshold, criticalThreshold]);

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return { notifications, dismiss };
}
