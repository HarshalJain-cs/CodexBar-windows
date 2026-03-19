import { Provider, ProviderId } from '@/types';
import TrendChart from './TrendChart';
import ResetTimer from './ResetTimer';
import { useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, GripVertical, Pin } from 'lucide-react';
import CardContextMenu from './CardContextMenu';
import { providerLogos } from '@/data/providerLogos';

interface ProviderCardProps {
  provider: Provider;
  onRefresh?: (id: string) => void;
  onDisable?: (id: ProviderId) => void;
  onPin?: (id: ProviderId) => void;
  isPinned?: boolean;
  animationsEnabled?: boolean;
  warningThreshold?: number;
  criticalThreshold?: number;
  privacyMode?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, id: ProviderId) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, id: ProviderId) => void;
}

function getUsageLevel(remaining: number, warning: number, critical: number) {
  if (remaining <= critical) return 'critical';
  if (remaining <= warning) return 'warning';
  return 'normal';
}

export default function ProviderCard({
  provider,
  onRefresh,
  onDisable,
  onPin,
  isPinned = false,
  animationsEnabled = true,
  warningThreshold = 30,
  criticalThreshold = 10,
  privacyMode = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}: ProviderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const sessionRemaining = 100 - provider.usage.sessionPercent;
  const weeklyRemaining = 100 - provider.usage.weeklyPercent;
  const sessionLevel = getUsageLevel(sessionRemaining, warningThreshold, criticalThreshold);
  const weeklyLevel = getUsageLevel(weeklyRemaining, warningThreshold, criticalThreshold);

  const statusDotClass =
    provider.statusInfo.status === 'operational'
      ? 'bg-cb-success'
      : provider.statusInfo.status === 'degraded'
        ? 'bg-cb-warning'
        : provider.statusInfo.status === 'outage'
          ? 'bg-cb-critical'
          : 'bg-cb-steady';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        className={`rounded-lg border border-border bg-card p-3 ${animationsEnabled ? 'cb-card-hover' : ''
          } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onContextMenu={handleContextMenu}
        draggable={draggable}
        onDragStart={e => onDragStart?.(e, provider.id)}
        onDragOver={e => { e.preventDefault(); onDragOver?.(e); }}
        onDrop={e => onDrop?.(e, provider.id)}
        role="article"
        aria-label={`${provider.name} usage card`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {draggable && (
              <GripVertical size={12} className="text-muted-foreground flex-shrink-0 cursor-grab" aria-hidden="true" />
            )}
            <img src={providerLogos[provider.id]} alt={provider.name} className="h-5 w-5 flex-shrink-0 rounded-sm object-contain" />
            <span className="text-sm font-semibold text-card-foreground truncate">{provider.name}</span>
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${statusDotClass}`} aria-label={`Status: ${provider.statusInfo.status}`} />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <TrendChart trend={provider.usage.trend} mini />
            {onPin && (
              <button
                onClick={() => onPin(provider.id)}
                className={`p-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${isPinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                aria-label={isPinned ? `Unpin ${provider.name}` : `Pin ${provider.name}`}
              >
                <Pin size={10} className={isPinned ? 'fill-primary' : ''} />
              </button>
            )}
            <button
              onClick={() => onRefresh?.(provider.id)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label={`Refresh ${provider.name}`}
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Session bar */}
        <div className="mb-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Session</span>
            <span
              className={`text-xs font-mono font-semibold ${sessionLevel === 'critical' ? 'text-cb-critical' :
                sessionLevel === 'warning' ? 'text-cb-warning' :
                  'text-card-foreground'
                }`}
            >
              {privacyMode ? '••' : `${provider.usage.sessionPercent}%`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-cb-bar-bg overflow-hidden" role="progressbar" aria-valuenow={provider.usage.sessionPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Session usage">
            <div
              className={`cb-usage-bar ${sessionLevel === 'critical' ? 'bg-cb-critical' :
                sessionLevel === 'warning' ? 'bg-cb-warning' :
                  'bg-cb-bar-session'
                }`}
              style={{ width: `${provider.usage.sessionPercent}%` }}
            />
          </div>
        </div>

        {/* Weekly bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Weekly</span>
            <span
              className={`text-xs font-mono font-semibold ${weeklyLevel === 'critical' ? 'text-cb-critical' :
                weeklyLevel === 'warning' ? 'text-cb-warning' :
                  'text-card-foreground'
                }`}
            >
              {privacyMode ? '••' : `${provider.usage.weeklyPercent}%`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-cb-bar-bg overflow-hidden" role="progressbar" aria-valuenow={provider.usage.weeklyPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Weekly usage">
            <div
              className={`cb-usage-bar ${weeklyLevel === 'critical' ? 'bg-cb-critical' :
                weeklyLevel === 'warning' ? 'bg-cb-warning' :
                  'bg-cb-bar-weekly'
                }`}
              style={{ width: `${provider.usage.weeklyPercent}%` }}
            />
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          <span>Details</span>
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-2 pt-2 border-t border-border">
            <TrendChart trend={provider.usage.trend} mini={false} />
            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className={`inline-block h-2 w-2 rounded-full ${statusDotClass}`} />
              <span>{provider.statusInfo.description}</span>
            </div>
            {/* Usage prediction */}
            {provider.usage.trend.direction === 'rising' && provider.usage.trend.points.length >= 2 && (() => {
              const pts = provider.usage.trend.points;
              const first = pts[0];
              const last = pts[pts.length - 1];
              const elapsed = (last.timestamp - first.timestamp) / 60000; // minutes
              const delta = last.value - first.value;
              if (delta > 0 && elapsed > 0) {
                const rate = delta / elapsed; // % per minute
                const remaining = 100 - provider.usage.sessionPercent;
                const minsLeft = remaining / rate;
                const hours = Math.floor(minsLeft / 60);
                const mins = Math.round(minsLeft % 60);
                const label = hours > 0 ? `~${hours}h ${mins}m` : `~${mins}m`;
                return (
                  <div className="mt-1.5 text-[10px] text-cb-warning flex items-center gap-1">
                    <span>⚡</span>
                    <span>At this rate, limit in <span className="font-semibold font-mono">{label}</span></span>
                  </div>
                );
              }
              return null;
            })()}
            <ResetTimer
              sessionResetsAt={provider.usage.sessionResetsAt}
              weeklyResetsAt={provider.usage.weeklyResetsAt}
            />
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <CardContextMenu
          provider={provider}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRefresh={id => onRefresh?.(id)}
          onDisable={id => onDisable?.(id)}
        />
      )}
    </>
  );
}
