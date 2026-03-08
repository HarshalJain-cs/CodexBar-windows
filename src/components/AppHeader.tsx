import { RefreshCw, Settings, Sun, Moon } from 'lucide-react';
import { ThemeMode } from '@/types';

interface AppHeaderProps {
  isRefreshing: boolean;
  lastRefresh: number;
  countdown: number;
  onRefresh: () => void;
  onOpenSettings: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export default function AppHeader({ isRefreshing, lastRefresh, countdown, onRefresh, onOpenSettings, theme, onToggleTheme }: AppHeaderProps) {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-card-foreground cb-mono tracking-tight">CodexBar</span>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground font-mono">{countdown}s</span>
          {/* Countdown ring */}
          <svg width="12" height="12" viewBox="0 0 12 12" className="text-primary opacity-50">
            <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="31.4" strokeDashoffset="0" opacity="0.2" />
            <circle
              cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeDasharray="31.4"
              strokeDashoffset={31.4 * (1 - countdown / 30)}
              strokeLinecap="round"
              transform="rotate(-90 6 6)"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Refresh all providers"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
