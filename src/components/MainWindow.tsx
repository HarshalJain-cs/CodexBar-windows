import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense, memo } from 'react';
import { useProviders } from '@/hooks/useProviders';
import { useSettings } from '@/hooks/useSettings';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ProviderId, ThemeMode, AlertLogEntry } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import ProviderCard from '@/components/ProviderCard';
import CompactProviderRow from '@/components/CompactProviderRow';
import SkeletonCard from '@/components/SkeletonCard';
import StatusPanel from '@/components/StatusPanel';
import SettingsPage from '@/components/SettingsPage';
import NotificationBanner, { useNotifications } from '@/components/NotificationBanner';
import DiagnosticsPanel from '@/components/DiagnosticsPanel';
import DashboardWidgets from '@/components/DashboardWidgets';
import ExportUsage from '@/components/ExportUsage';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import SearchFilter from '@/components/SearchFilter';
import QuickStats from '@/components/QuickStats';
import AlertsLog from '@/components/AlertsLog';
import CommandPalette, { useCommandActions } from '@/components/CommandPalette';
import UpdateBanner from '@/components/UpdateBanner';
import ShortcutsHelp from '@/components/ShortcutsHelp';
import SessionSummary from '@/components/SessionSummary';
import { applyAccentColor } from '@/components/AccentColorPicker';
import { toast } from 'sonner';
import { Pin, Focus } from 'lucide-react';

// Lazy-load heavy chart components for performance
const UsageHistoryChart = lazy(() => import('@/components/UsageHistoryChart'));
const UsagePredictions = lazy(() => import('@/components/UsagePredictions'));
const WeeklySummary = lazy(() => import('@/components/WeeklySummary'));

// Provider categories
const PROVIDER_CATEGORIES: Record<string, ProviderId[]> = {
  'AI Coding': ['codex', 'cursor', 'copilot', 'windsurf', 'augment'],
  'AI Chat': ['claude', 'gemini'],
  'AI Agent': ['kiro', 'devin'],
};

type View = 'dashboard' | 'settings';

export default function MainWindow() {
  const { settings, updateSettings, exportSettings, importSettings } = useSettings();
  const {
    providers,
    isRefreshing,
    isLoading,
    isPaused,
    lastRefresh,
    countdown,
    refreshLogs,
    refresh,
    refreshProvider,
    disableProvider,
    setProviders,
    togglePause,
  } = useProviders(settings.refreshInterval);

  const [view, setView] = useState<View>('dashboard');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [draggedId, setDraggedId] = useState<ProviderId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlerts, setShowAlerts] = useState(false);
  const [alertsHistory, setAlertsHistory] = useState<AlertLogEntry[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevProvidersRef = useRef(providers);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [settings.theme]);

  // Scroll to top on view switch
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  // Reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches && settings.animationsEnabled) {
      updateSettings({ animationsEnabled: false });
    }
  }, []);

  // Ctrl+K command palette + ? shortcuts help
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === '?' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Apply accent color
  useEffect(() => {
    applyAccentColor(settings.accentColor);
  }, [settings.accentColor]);

  // Window position memory
  useEffect(() => {
    import('@tauri-apps/api/window').then((mod) => {
      const win = mod.getCurrentWindow();
      const saved = localStorage.getItem('cb-window-pos');
      if (saved) {
        try {
          const { x, y, width, height } = JSON.parse(saved);
          win.setPosition(new mod.PhysicalPosition(x, y)).catch(() => { });
          win.setSize(new mod.PhysicalSize(width, height)).catch(() => { });
        } catch { }
      }
      // Save on move/resize  
      const savePos = async () => {
        try {
          const pos = await win.outerPosition();
          const size = await win.outerSize();
          localStorage.setItem('cb-window-pos', JSON.stringify({
            x: pos.x, y: pos.y, width: size.width, height: size.height,
          }));
        } catch { }
      };
      const interval = setInterval(savePos, 5000);
      return () => clearInterval(interval);
    }).catch(() => { });
  }, []);

  // Data retention — prune old refresh logs
  useEffect(() => {
    if (refreshLogs.length === 0) return;
    const cutoff = Date.now() - settings.dataRetentionDays * 86400000;
    const recent = refreshLogs.filter(l => l.timestamp > cutoff);
    if (recent.length < refreshLogs.length) {
      // Logs are managed by useProviders, but we prune alerts history
      setAlertsHistory(h => h.filter(a => a.timestamp > cutoff));
    }
  }, [refreshLogs, settings.dataRetentionDays]);

  // Send tray tooltip update when usage changes
  useEffect(() => {
    if (isLoading || providers.length === 0) return;
    const summary = providers
      .filter(p => settings.enabledProviders.includes(p.id))
      .slice(0, 3)
      .map(p => `${p.name}: ${p.usage.sessionPercent}%`)
      .join(' | ');
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('update_tray_tooltip', { tooltip: `CodexBar\n${summary}` }).catch(() => { });
    }).catch(() => { });
  }, [providers, settings.enabledProviders, isLoading]);

  const enabledProviders = useMemo(
    () => providers.filter(p => settings.enabledProviders.includes(p.id)),
    [providers, settings.enabledProviders]
  );

  // Filter by search query + focus mode
  const filteredProviders = useMemo(
    () => {
      let list = searchQuery
        ? enabledProviders.filter(p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : enabledProviders;
      if (settings.focusMode) {
        list = list.filter(p => {
          const remaining = 100 - p.usage.sessionPercent;
          const thresholds = settings.providerThresholds[p.id];
          const warning = thresholds?.warning ?? settings.warningThreshold;
          return remaining <= warning;
        });
      }
      return list;
    },
    [enabledProviders, searchQuery, settings.focusMode, settings.warningThreshold, settings.providerThresholds]
  );

  // Sort: pinned first, then by providerOrder
  const sortedProviders = useMemo(
    () => [...filteredProviders].sort((a, b) => {
      const aPinned = settings.pinnedProviders.includes(a.id) ? 0 : 1;
      const bPinned = settings.pinnedProviders.includes(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      const ai = settings.providerOrder.indexOf(a.id);
      const bi = settings.providerOrder.indexOf(b.id);
      return ai - bi;
    }),
    [filteredProviders, settings.providerOrder, settings.pinnedProviders]
  );

  // Helper to get effective thresholds for a provider
  const getThresholds = useCallback(
    (providerId: ProviderId) => {
      const custom = settings.providerThresholds[providerId];
      return {
        warning: custom?.warning ?? settings.warningThreshold,
        critical: custom?.critical ?? settings.criticalThreshold,
      };
    },
    [settings.providerThresholds, settings.warningThreshold, settings.criticalThreshold]
  );

  // Real-time threshold notifications (uses per-provider thresholds)
  useEffect(() => {
    if (isLoading) return;
    const prev = prevProvidersRef.current;
    const useSystemNotification = settings.notificationType === 'system' || settings.notificationType === 'both';

    enabledProviders.forEach(p => {
      const prevProvider = prev.find(pp => pp.id === p.id);
      if (!prevProvider) return;

      const { warning, critical } = getThresholds(p.id);
      const remaining = 100 - p.usage.sessionPercent;
      const prevRemaining = 100 - prevProvider.usage.sessionPercent;

      // Crossed critical threshold
      if (remaining <= critical && prevRemaining > critical) {
        const msg = `Only ${remaining}% session remaining!`;
        toast.error(`🚨 ${p.name}: ${msg}`, { duration: 6000 });
        setAlertsHistory(h => [{
          id: `${p.id}-${Date.now()}`,
          providerId: p.id,
          providerName: p.name,
          type: 'critical' as const,
          message: msg,
          timestamp: Date.now(),
        }, ...h].slice(0, 50));
        if (useSystemNotification) {
          import('@tauri-apps/plugin-notification').then(({ sendNotification }) => {
            sendNotification({ title: 'CodexBar — Critical', body: `${p.name}: ${msg}` });
          }).catch(() => { });
        }
      }
      // Crossed warning threshold
      else if (remaining <= warning && prevRemaining > warning) {
        const msg = `${remaining}% session remaining`;
        toast.warning(`⚠️ ${p.name}: ${msg}`, { duration: 4000 });
        setAlertsHistory(h => [{
          id: `${p.id}-${Date.now()}`,
          providerId: p.id,
          providerName: p.name,
          type: 'warning' as const,
          message: msg,
          timestamp: Date.now(),
        }, ...h].slice(0, 50));
        if (useSystemNotification) {
          import('@tauri-apps/plugin-notification').then(({ sendNotification }) => {
            sendNotification({ title: 'CodexBar — Warning', body: `${p.name}: ${msg}` });
          }).catch(() => { });
        }
      }
    });

    prevProvidersRef.current = providers;
  }, [providers, enabledProviders, settings.notificationType, isLoading, getThresholds]);

  const { notifications, dismiss } = useNotifications(
    enabledProviders,
    settings.warningThreshold,
    settings.criticalThreshold
  );

  const showNotifications =
    settings.notificationType === 'in-app' || settings.notificationType === 'both';

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onRefresh: refresh,
    onOpenSettings: () => setView(v => v === 'settings' ? 'dashboard' : 'settings'),
    onExport: exportSettings,
    onSelectProvider: (index) => {
      if (index < sortedProviders.length) {
        refreshProvider(sortedProviders[index].id);
        toast.info(`Refreshing ${sortedProviders[index].name}...`);
      }
    },
  });

  // Command palette actions
  const commandActions = useCommandActions({
    onRefresh: refresh,
    onOpenSettings: () => setView('settings'),
    onExportSettings: exportSettings,
    onTogglePrivacy: () => updateSettings({ privacyMode: !settings.privacyMode }),
    onOpenAlerts: () => setShowAlerts(true),
    onCheckUpdates: () => {
      import('./UpdateBanner').then(m => {
        m.checkForUpdateManual().then(v => {
          if (v) toast.success(`Update v${v} available!`);
          else toast.info('You\'re on the latest version');
        });
      });
    },
    privacyMode: settings.privacyMode,
  });

  // Pin/unpin provider
  const togglePin = (id: ProviderId) => {
    const pinned = settings.pinnedProviders.includes(id)
      ? settings.pinnedProviders.filter(p => p !== id)
      : [...settings.pinnedProviders, id];
    updateSettings({ pinnedProviders: pinned });
  };

  // Drag reorder
  const handleDragStart = (e: React.DragEvent, id: ProviderId) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: ProviderId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const order = [...settings.providerOrder];
    const fromIdx = order.indexOf(draggedId);
    const toIdx = order.indexOf(targetId);
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, draggedId);
    updateSettings({ providerOrder: order });
    setDraggedId(null);
  };

  const handleDisable = (id: ProviderId) => {
    updateSettings({
      enabledProviders: settings.enabledProviders.filter(p => p !== id),
    });
  };

  const pageVariants = {
    initial: { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 12 },
  };

  return (
    <div
      className={`flex flex-col h-screen w-full bg-background ${!settings.animationsEnabled ? 'cb-no-animations' : ''
        }`}
    >
      <OnboardingOverlay />

      {/* Command Palette */}
      <CommandPalette
        actions={commandActions}
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Alerts History */}
      <AnimatePresence>
        {showAlerts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AlertsLog
              alerts={alertsHistory}
              onClear={() => setAlertsHistory([])}
              onClose={() => setShowAlerts(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'settings' ? (
          <motion.div
            key="settings"
            className="flex flex-col h-full"
            variants={settings.animationsEnabled ? pageVariants : undefined}
            initial={settings.animationsEnabled ? 'initial' : undefined}
            animate={settings.animationsEnabled ? 'animate' : undefined}
            exit={settings.animationsEnabled ? 'exit' : undefined}
            transition={{ duration: 0.2 }}
          >
            <SettingsPage
              settings={settings}
              providers={providers}
              onUpdateSettings={updateSettings}
              onRefreshProvider={refreshProvider}
              onBack={() => setView('dashboard')}
              onOpenDiagnostics={() => setShowDiagnostics(true)}
              onExportSettings={exportSettings}
              onImportSettings={importSettings}
              debugMode={debugMode}
              onToggleDebugMode={() => setDebugMode(!debugMode)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            className="flex flex-col h-full"
            variants={settings.animationsEnabled ? pageVariants : undefined}
            initial={settings.animationsEnabled ? 'initial' : undefined}
            animate={settings.animationsEnabled ? 'animate' : undefined}
            exit={settings.animationsEnabled ? 'exit' : undefined}
            transition={{ duration: 0.2 }}
          >
            <AppHeader
              isRefreshing={isRefreshing}
              isPaused={isPaused}
              lastRefresh={lastRefresh}
              countdown={countdown}
              refreshInterval={settings.refreshInterval}
              onRefresh={refresh}
              onTogglePause={togglePause}
              onOpenSettings={() => setView('settings')}
              theme={settings.theme}
              onToggleTheme={() => {
                const next: ThemeMode = settings.theme === 'dark' ? 'light' : settings.theme === 'light' ? 'system' : 'dark';
                updateSettings({ theme: next });
              }}
            />

            {/* Update banner */}
            <UpdateBanner animationsEnabled={settings.animationsEnabled} />

            {/* Notification banners */}
            <AnimatePresence>
              {showNotifications &&
                notifications.slice(0, 2).map(n => (
                  <motion.div
                    key={n.id}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <NotificationBanner
                      type={n.type}
                      providerName={n.providerName}
                      message={n.message}
                      onDismiss={() => dismiss(n.id)}
                    />
                  </motion.div>
                ))}
            </AnimatePresence>

            {/* Search filter + focus mode + privacy toggle */}
            <div className="px-3 pt-2 flex items-center gap-2">
              <div className="flex-1">
                <SearchFilter value={searchQuery} onChange={setSearchQuery} />
              </div>
              <button
                onClick={() => updateSettings({ focusMode: !settings.focusMode })}
                className={`p-1.5 rounded-md border transition-colors text-xs ${settings.focusMode
                  ? 'border-cb-warning bg-cb-warning/10 text-cb-warning'
                  : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
                  }`}
                title={settings.focusMode ? 'Show all providers' : 'Focus: show only at-risk providers'}
                aria-label="Toggle focus mode"
              >
                <Focus size={12} />
              </button>
              <button
                onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
                className={`p-1.5 rounded-md border transition-colors text-xs ${settings.privacyMode
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
                  }`}
                title={settings.privacyMode ? 'Disable privacy mode' : 'Enable privacy mode'}
                aria-label="Toggle privacy mode"
              >
                {settings.privacyMode ? '🔒' : '👁️'}
              </button>
              <button
                onClick={() => setShowAlerts(true)}
                className="relative p-1.5 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors text-xs"
                title="Alerts history"
                aria-label="View alerts history"
              >
                🔔
                {alertsHistory.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cb-critical text-[7px] text-white flex items-center justify-center font-bold">
                    {alertsHistory.length > 9 ? '9+' : alertsHistory.length}
                  </span>
                )}
              </button>
            </div>

            {/* Provider cards / compact rows */}
            <div ref={scrollRef} className="flex-1 cb-scroll-area p-3">
              {isLoading ? (
                settings.viewMode === 'compact' ? (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                      <SkeletonCard key={i} compact />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2.5 grid-cols-1 min-[300px]:grid-cols-2 min-[800px]:grid-cols-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                )
              ) : sortedProviders.length === 0 && searchQuery ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No providers match "{searchQuery}"
                </div>
              ) : settings.viewMode === 'grouped' ? (
                <div className="space-y-3">
                  {Object.entries(PROVIDER_CATEGORIES).map(([category, ids]) => {
                    const categoryProviders = sortedProviders.filter(p => ids.includes(p.id));
                    if (categoryProviders.length === 0) return null;
                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{category}</span>
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {Math.round(categoryProviders.reduce((s, p) => s + p.usage.sessionPercent, 0) / categoryProviders.length)}% avg
                          </span>
                        </div>
                        <div className="grid gap-2.5 grid-cols-1 min-[300px]:grid-cols-2 min-[800px]:grid-cols-3">
                          {categoryProviders.map((provider, index) => (
                            <motion.div
                              key={provider.id}
                              initial={settings.animationsEnabled ? { opacity: 0, y: 12, scale: 0.95 } : undefined}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: index * 0.06, type: 'spring', damping: 20, stiffness: 300 }}
                              whileHover={settings.animationsEnabled ? { scale: 1.02, y: -2 } : undefined}
                              className="relative"
                            >
                              {settings.pinnedProviders.includes(provider.id) && (
                                <div className="absolute -top-1 -left-1 z-10">
                                  <Pin size={10} className="text-primary fill-primary" />
                                </div>
                              )}
                              <ProviderCard
                                provider={provider}
                                onRefresh={refreshProvider}
                                onDisable={handleDisable}
                                onPin={togglePin}
                                isPinned={settings.pinnedProviders.includes(provider.id)}
                                animationsEnabled={settings.animationsEnabled}
                                warningThreshold={getThresholds(provider.id).warning}
                                criticalThreshold={getThresholds(provider.id).critical}
                                privacyMode={settings.privacyMode}
                                draggable
                                onDragStart={handleDragStart}
                                onDrop={handleDrop}
                              />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : settings.viewMode === 'compact' ? (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Provider</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold w-8 text-right">Sess</span>
                      <span className="text-[8px] text-muted-foreground">/</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold w-8 text-right">Week</span>
                    </div>
                  </div>
                  {sortedProviders.map((provider, index) => (
                    <motion.div
                      key={provider.id}
                      initial={settings.animationsEnabled ? { opacity: 0, y: 8 } : undefined}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <CompactProviderRow
                        provider={provider}
                        warningThreshold={getThresholds(provider.id).warning}
                        criticalThreshold={getThresholds(provider.id).critical}
                        privacyMode={settings.privacyMode}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2.5 grid-cols-1 min-[300px]:grid-cols-2 min-[800px]:grid-cols-3">
                  {sortedProviders.map((provider, index) => (
                    <motion.div
                      key={provider.id}
                      initial={settings.animationsEnabled ? { opacity: 0, y: 12, scale: 0.95 } : undefined}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: index * 0.06,
                        type: 'spring',
                        damping: 20,
                        stiffness: 300,
                      }}
                      whileHover={settings.animationsEnabled ? { scale: 1.02, y: -2 } : undefined}
                      className="relative"
                    >
                      {/* Pin indicator */}
                      {settings.pinnedProviders.includes(provider.id) && (
                        <div className="absolute -top-1 -left-1 z-10">
                          <Pin size={10} className="text-primary fill-primary" />
                        </div>
                      )}
                      <ProviderCard
                        provider={provider}
                        onRefresh={refreshProvider}
                        onDisable={handleDisable}
                        onPin={togglePin}
                        isPinned={settings.pinnedProviders.includes(provider.id)}
                        animationsEnabled={settings.animationsEnabled}
                        warningThreshold={getThresholds(provider.id).warning}
                        criticalThreshold={getThresholds(provider.id).critical}
                        privacyMode={settings.privacyMode}
                        draggable
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Session Summary */}
              {!isLoading && sortedProviders.length > 0 && (
                <div className="mt-3">
                  <SessionSummary
                    providers={sortedProviders}
                    refreshLogCount={refreshLogs.length}
                    animationsEnabled={settings.animationsEnabled}
                    privacyMode={settings.privacyMode}
                  />
                </div>
              )}

              {/* Dashboard Widgets */}
              {!isLoading && sortedProviders.length > 0 && (
                <div className="mt-3">
                  <DashboardWidgets
                    providers={sortedProviders}
                    refreshLogs={refreshLogs}
                    animationsEnabled={settings.animationsEnabled}
                    privacyMode={settings.privacyMode}
                  />
                </div>
              )}

              {/* Burndown predictions */}
              {!isLoading && sortedProviders.length > 0 && (
                <div className="mt-3">
                  <Suspense fallback={null}>
                    <UsagePredictions
                      providers={sortedProviders}
                      animationsEnabled={settings.animationsEnabled}
                      privacyMode={settings.privacyMode}
                    />
                  </Suspense>
                </div>
              )}

              {/* Weekly summary */}
              {!isLoading && sortedProviders.length > 0 && (
                <div className="mt-3">
                  <Suspense fallback={null}>
                    <WeeklySummary
                      providers={sortedProviders}
                      animationsEnabled={settings.animationsEnabled}
                      privacyMode={settings.privacyMode}
                    />
                  </Suspense>
                </div>
              )}

              {/* Usage history chart (lazy loaded) */}
              {!isLoading && sortedProviders.length > 0 && (
                <div className="mt-3">
                  <Suspense fallback={<div className="h-[200px] rounded-lg border border-border bg-card animate-pulse" />}>
                    <UsageHistoryChart
                      providers={sortedProviders}
                      animationsEnabled={settings.animationsEnabled}
                    />
                  </Suspense>
                </div>
              )}

              {/* Export button */}
              {!isLoading && sortedProviders.length > 0 && (
                <div className="mt-3 flex justify-end">
                  <ExportUsage providers={sortedProviders} />
                </div>
              )}
            </div>

            {/* Quick Stats footer */}
            <QuickStats providers={enabledProviders} privacyMode={settings.privacyMode} />

            {/* Status panel */}
            <StatusPanel providers={enabledProviders} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diagnostics overlay */}
      <AnimatePresence>
        {showDiagnostics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DiagnosticsPanel
              onClose={() => setShowDiagnostics(false)}
              providers={providers}
              refreshLogs={refreshLogs}
              debugMode={debugMode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortcuts Help */}
      <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
