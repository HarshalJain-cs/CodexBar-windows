import { forwardRef } from 'react';
import { Provider } from '@/types';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface ExportUsageProps {
  providers: Provider[];
}

const ExportUsage = forwardRef<HTMLButtonElement, ExportUsageProps>(({ providers }, ref) => {
  const exportCSV = () => {
    const headers = ['Provider', 'Session %', 'Weekly %', 'Status', 'Auth Status', 'Trend'];
    const rows = providers.map(p => [
      p.name,
      p.usage.sessionPercent,
      p.usage.weeklyPercent,
      p.statusInfo.status,
      p.authStatus,
      p.usage.trend.direction,
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codexbar-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Usage report exported as CSV');
  };

  return (
    <button
      ref={ref}
      onClick={exportCSV}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium hover:bg-secondary/80 transition-colors"
      aria-label="Export usage report"
    >
      <Download size={12} />
      Export Report
    </button>
  );
});

ExportUsage.displayName = 'ExportUsage';
export default ExportUsage;
