import { useState } from 'react';
import { X, Copy, Download, Bug } from 'lucide-react';
import { toast } from 'sonner';

interface RefreshLog {
  provider: string;
  timestamp: number;
  success: boolean;
  duration: number;
}

interface DiagnosticsPanelProps {
  onClose: () => void;
  providers: { id: string; name: string; authStatus: string; statusInfo: { status: string; lastChecked: number } }[];
  refreshLogs: RefreshLog[];
  debugMode: boolean;
}

function timeStr(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function DiagnosticsPanel({ onClose, providers, refreshLogs, debugMode }: DiagnosticsPanelProps) {
  const diagnosticData = {
    appVersion: '1.1.2',
    os: navigator.platform,
    userAgent: navigator.userAgent,
    providers: providers.map(p => ({
      id: p.id,
      name: p.name,
      authStatus: p.authStatus,
      status: p.statusInfo.status,
      lastChecked: timeStr(p.statusInfo.lastChecked),
    })),
    refreshLogs: refreshLogs.slice(-10).map(l => ({
      provider: l.provider,
      time: timeStr(l.timestamp),
      result: l.success ? 'OK' : 'FAIL',
      duration: `${l.duration}ms`,
    })),
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(diagnosticData, null, 2));
    toast.success('Diagnostics copied to clipboard');
  };

  const saveToFile = () => {
    const blob = new Blob([JSON.stringify(diagnosticData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codexbar-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] rounded-lg border border-border bg-card shadow-xl flex flex-col m-3">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bug size={14} className="text-primary" />
            <span className="text-sm font-semibold text-card-foreground">Diagnostics</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Close diagnostics">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 cb-scroll-area p-4 space-y-4 text-xs">
          {/* System info */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">System</h3>
            <div className="space-y-1 bg-secondary rounded-md p-2.5">
              <Row label="Version" value={diagnosticData.appVersion} />
              <Row label="Platform" value={diagnosticData.os} />
            </div>
          </section>

          {/* Provider status */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Providers</h3>
            <div className="space-y-1 bg-secondary rounded-md p-2.5">
              {diagnosticData.providers.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-card-foreground font-medium">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      p.authStatus === 'authenticated' ? 'cb-badge-operational' :
                      p.authStatus === 'expired' ? 'cb-badge-degraded' : 'cb-badge-unknown'
                    }`}>
                      {p.authStatus}
                    </span>
                    <span className="text-muted-foreground">{p.lastChecked}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Refresh logs */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Refresh Log</h3>
            <div className="bg-secondary rounded-md p-2.5 space-y-1">
              {refreshLogs.length === 0 ? (
                <span className="text-muted-foreground">No refresh attempts yet</span>
              ) : (
                refreshLogs.slice(-10).reverse().map((log, i) => (
                  <div key={i} className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-card-foreground">{log.provider}</span>
                    <div className="flex items-center gap-2">
                      <span className={log.success ? 'text-cb-success' : 'text-cb-critical'}>
                        {log.success ? 'OK' : 'FAIL'}
                      </span>
                      <span className="text-muted-foreground">{log.duration}ms</span>
                      <span className="text-muted-foreground">{timeStr(log.timestamp)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Debug mode raw data */}
          {debugMode && (
            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Raw Data</h3>
              <pre className="bg-secondary rounded-md p-2.5 text-[9px] font-mono text-muted-foreground overflow-x-auto max-h-32 cb-scroll-area">
                {JSON.stringify(diagnosticData, null, 2)}
              </pre>
            </section>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 py-3 border-t border-border">
          <button onClick={copyToClipboard} className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <Copy size={12} />
            Copy
          </button>
          <button onClick={saveToFile} className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <Download size={12} />
            Save File
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-card-foreground font-mono">{value}</span>
    </div>
  );
}
