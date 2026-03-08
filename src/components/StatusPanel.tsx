import { Provider } from '@/types';
import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface StatusPanelProps {
  providers: Provider[];
}

function statusLabel(status: string) {
  switch (status) {
    case 'operational': return 'Operational';
    case 'degraded': return 'Degraded';
    case 'outage': return 'Outage';
    default: return 'Unknown';
  }
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

export default function StatusPanel({ providers }: StatusPanelProps) {
  const hasIssue = providers.some(p => p.statusInfo.status !== 'operational');
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          {hasIssue ? (
            <span className="h-2 w-2 rounded-full bg-cb-warning animate-pulse" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-cb-success" />
          )}
          <span className="font-medium">
            {hasIssue ? 'Some providers have issues' : 'All systems operational'}
          </span>
        </div>
        {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {providers.map(p => (
            <div key={p.id} className="flex items-start justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    p.statusInfo.status === 'operational'
                      ? 'bg-cb-success'
                      : p.statusInfo.status === 'degraded'
                      ? 'bg-cb-warning'
                      : p.statusInfo.status === 'outage'
                      ? 'bg-cb-critical'
                      : 'bg-cb-steady'
                  }`}
                />
                <div className="min-w-0">
                  <span className="font-medium text-card-foreground">{p.name}</span>
                  <span className="ml-1.5 text-muted-foreground">{p.statusInfo.description}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-muted-foreground">{timeAgo(p.statusInfo.lastChecked)}</span>
                <a
                  href={p.statusInfo.statusPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
                  aria-label={`View ${p.name} status page`}
                >
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ))}

          {/* Status history for providers with issues */}
          {providers
            .filter(p => p.statusInfo.status !== 'operational')
            .map(p => (
              <div key={`history-${p.id}`} className="pl-4 border-l-2 border-border mt-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {p.name} history
                </span>
                {p.statusInfo.history.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        h.status === 'operational'
                          ? 'bg-cb-success'
                          : h.status === 'degraded'
                          ? 'bg-cb-warning'
                          : 'bg-cb-critical'
                      }`}
                    />
                    <span>{statusLabel(h.status)}</span>
                    <span>·</span>
                    <span>{timeAgo(h.timestamp)}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
