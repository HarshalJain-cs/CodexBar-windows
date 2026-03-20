import { forwardRef } from 'react';
import { Provider } from '@/types';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface ExportUsageProps {
  providers: Provider[];
}

function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const ExportUsage = forwardRef<HTMLButtonElement, ExportUsageProps>(({ providers }, ref) => {
  const exportCSV = () => {
    const headers = [
      'Provider', 'Session %', 'Weekly %', 'Session Label', 'Weekly Label',
      'Status', 'Status Description', 'Auth Status', 'Trend Direction',
      'Session Resets At', 'Weekly Resets At', 'Exported At',
    ];
    const rows = providers.map(p => [
      escapeCSV(p.name),
      p.usage.sessionPercent,
      p.usage.weeklyPercent,
      escapeCSV(p.usage.sessionLabel),
      escapeCSV(p.usage.weeklyLabel),
      p.statusInfo.status,
      escapeCSV(p.statusInfo.description),
      p.authStatus,
      p.usage.trend.direction,
      escapeCSV(p.usage.sessionResetsAt || 'N/A'),
      escapeCSV(p.usage.weeklyResetsAt || 'N/A'),
      new Date().toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    // BOM for Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codexbar-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Usage report exported as CSV');
  };

  const exportJSON = () => {
    const data = providers.map(p => ({
      id: p.id,
      name: p.name,
      usage: {
        sessionPercent: p.usage.sessionPercent,
        weeklyPercent: p.usage.weeklyPercent,
        sessionLabel: p.usage.sessionLabel,
        weeklyLabel: p.usage.weeklyLabel,
        trend: p.usage.trend.direction,
      },
      status: p.statusInfo.status,
      authStatus: p.authStatus,
      exportedAt: new Date().toISOString(),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codexbar-usage-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Usage report exported as JSON');
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        ref={ref}
        onClick={exportCSV}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium hover:bg-secondary/80 transition-colors"
        aria-label="Export usage report as CSV"
      >
        <Download size={12} />
        CSV
      </button>
      <button
        onClick={exportJSON}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium hover:bg-secondary/80 transition-colors"
        aria-label="Export usage report as JSON"
      >
        <Download size={12} />
        JSON
      </button>
    </div>
  );
});

ExportUsage.displayName = 'ExportUsage';
export default ExportUsage;
