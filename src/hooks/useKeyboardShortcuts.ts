import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
  onRefresh: () => void;
  onOpenSettings: () => void;
  onExport: () => void;
  onSelectProvider?: (index: number) => void;
}

export function useKeyboardShortcuts({
  onRefresh,
  onOpenSettings,
  onExport,
  onSelectProvider,
}: KeyboardShortcutsProps) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Ctrl+R: Refresh
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        onRefresh();
      }

      // Ctrl+,: Open Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        onOpenSettings();
      }

      // Ctrl+E: Export
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        onExport();
      }

      // Number keys 1-9: Select provider
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          onSelectProvider?.(num - 1);
        }
      }
    },
    [onRefresh, onOpenSettings, onExport, onSelectProvider]
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
