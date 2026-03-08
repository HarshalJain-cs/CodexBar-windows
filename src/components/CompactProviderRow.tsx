import { Provider } from '@/types';
import { providerLogos } from '@/data/providerLogos';

interface CompactProviderRowProps {
  provider: Provider;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export default function CompactProviderRow({
  provider,
  warningThreshold = 30,
  criticalThreshold = 10,
}: CompactProviderRowProps) {
  const sessionRemaining = 100 - provider.usage.sessionPercent;
  const weeklyRemaining = 100 - provider.usage.weeklyPercent;

  const getColor = (remaining: number) => {
    if (remaining <= criticalThreshold) return 'text-cb-critical';
    if (remaining <= warningThreshold) return 'text-cb-warning';
    return 'text-card-foreground';
  };

  const statusDot =
    provider.statusInfo.status === 'operational'
      ? 'bg-cb-success'
      : provider.statusInfo.status === 'degraded'
      ? 'bg-cb-warning'
      : provider.statusInfo.status === 'outage'
      ? 'bg-cb-critical'
      : 'bg-cb-steady';

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
      <img src={providerLogos[provider.id]} alt={provider.name} className="h-4 w-4 flex-shrink-0 rounded-sm object-contain" />
      <span className="text-xs font-medium text-card-foreground flex-1 min-w-0 truncate">
        {provider.name}
      </span>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
      <span className={`text-[10px] font-mono font-semibold w-8 text-right ${getColor(sessionRemaining)}`}>
        {provider.usage.sessionPercent}%
      </span>
      <span className="text-[8px] text-muted-foreground">/</span>
      <span className={`text-[10px] font-mono font-semibold w-8 text-right ${getColor(weeklyRemaining)}`}>
        {provider.usage.weeklyPercent}%
      </span>
    </div>
  );
}
