import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useProviders } from '@/hooks/useProviders';
import { useSettings } from '@/hooks/useSettings';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ProviderId, ThemeMode } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import ProviderCard from '@/components/ProviderCard';
import CompactProviderRow from '@/components/CompactProviderRow';
import SkeletonCard from '@/components/SkeletonCard';
import StatusPanel from '@/components/StatusPanel';
import SettingsPage from '@/components/SettingsPage';
import NotificationBanner, { useNotifications } from '@/components/NotificationBanner';
import DiagnosticsPanel from '@/components/DiagnosticsPanel';
import UsageHistoryChart from '@/components/UsageHistoryChart';
import DashboardWidgets from '@/components/DashboardWidgets';
import ExportUsage from '@/components/ExportUsage';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import { toast } from 'sonner';

type View = 'dashboard' | 'settings';

export default function MainWindow() {
  const { settings, updateSettings, exportSettings, importSettings } = useSettings();
  const {
    providers,
    isRefreshing,
    isLoading,
    lastRefresh,
    countdown,
    refreshLogs,
    refresh,
    refreshProvider,
    disableProvider,
    setProviders,
  } = useProviders(settings.refreshInterval);

  const [view, setView] = useState<View>('dashboard');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [draggedId, setDraggedId] = useState<ProviderId | null>(null);
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

  const enabledProviders = useMemo(
    () => providers.filter(p => settings.enabledProviders.includes(p.id)),
    [providers, settings.enabledProviders]
  );

  const sortedProviders = useMemo(
    () => [...enabledProviders].sort((a, b) => {
      const ai = settings.providerOrder.indexOf(a.id);
      const bi = settings.providerOrder.indexOf(b.id);
      return ai - bi;
    }),
    [enabledProviders, settings.providerOrder]
  );

  // Real-time threshold notifications
  useEffect(() => {
    if (isLoading) return;
    const prev = prevProvidersRef.current;
    
    enabledProviders.forEach(p => {
      const prevProvider = prev.find(pp => pp.id === p.id);
      if (!prevProvider) return;

      const remaining = 100 - p.usage.sessionPercent;
      const prevRemaining = 100 - prevProvider.usage.sessionPercent;

      // Crossed critical threshold
      if (remaining <= settings.criticalThreshold && prevRemaining > settings.criticalThreshold) {
        toast.error(`🚨 ${p.name}: Only ${remaining}% session remaining!`, {
          duration: 6000,
        });
      }
      // Crossed warning threshold
      else if (remaining <= settings.warningThreshold && prevRemaining > settings.warningThreshold) {
        toast.warning(`⚠️ ${p.name}: ${remaining}% session remaining`, {
          duration: 4000,
        });
      }
    });

    prevProvidersRef.current = providers;
  }, [providers, enabledProviders, settings.warningThreshold, settings.criticalThreshold, isLoading]);

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
      className={`flex flex-col h-screen w-full bg-background ${
        !settings.animationsEnabled ? 'cb-no-animations' : ''
      }`}
    >
      <OnboardingOverlay />

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
              onUpdateSettings={updateSettings}
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
              lastRefresh={lastRefresh}
              countdown={countdown}
              onRefresh={refresh}
              onOpenSettings={() => setView('settings')}
              theme={settings.theme}
              onToggleTheme={() => {
                const next: ThemeMode = settings.theme === 'dark' ? 'light' : settings.theme === 'light' ? 'system' : 'dark';
                updateSettings({ theme: next });
              }}
            />

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
                        warningThreshold={settings.warningThreshold}
                        criticalThreshold={settings.criticalThreshold}
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
                    >
                      <ProviderCard
                        provider={provider}
                        onRefresh={refreshProvider}
                        onDisable={handleDisable}
                        animationsEnabled={settings.animationsEnabled}
                        warningThreshold={settings.warningThreshold}
                        criticalThreshold={settings.criticalThreshold}
                        draggable
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Dashboard Widgets */}
              {!isLoading && sortedProviders.length > 0 && (
                <div className="mt-3">
                  <DashboardWidgets
                    providers={sortedProviders}
                    animationsEnabled={settings.animationsEnabled}
                  />
                </div>
              )}

              {/* Usage history chart */}
              {!isLoading && sortedProviders.length > 0 && (
                <div className="mt-3">
                  <UsageHistoryChart
                    providers={sortedProviders}
                    animationsEnabled={settings.animationsEnabled}
                  />
                </div>
              )}

              {/* Export button */}
              {!isLoading && sortedProviders.length > 0 && (
                <div className="mt-3 flex justify-end">
                  <ExportUsage providers={sortedProviders} />
                </div>
              )}
            </div>

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
    </div>
  );
}
