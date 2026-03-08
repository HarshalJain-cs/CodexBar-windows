import { Provider, ProviderId } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Copy, ExternalLink, EyeOff } from 'lucide-react';

interface CardContextMenuProps {
  provider: Provider;
  x: number;
  y: number;
  onClose: () => void;
  onRefresh: (id: string) => void;
  onDisable: (id: ProviderId) => void;
}

export default function CardContextMenu({
  provider,
  x,
  y,
  onClose,
  onRefresh,
  onDisable,
}: CardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  const copyUsage = () => {
    const text = `${provider.name}: ${100 - provider.usage.sessionPercent}% remaining (session), ${100 - provider.usage.weeklyPercent}% remaining (weekly)`;
    navigator.clipboard.writeText(text);
    onClose();
  };

  const items = [
    { icon: RefreshCw, label: 'Refresh', action: () => { onRefresh(provider.id); onClose(); } },
    { icon: ExternalLink, label: 'Open Dashboard', action: () => { window.open(provider.statusInfo.statusPageUrl, '_blank'); onClose(); } },
    { icon: Copy, label: 'Copy Usage', action: copyUsage },
    { icon: EyeOff, label: 'Disable Provider', action: () => { onDisable(provider.id); onClose(); }, danger: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg py-1 animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
      role="menu"
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={item.action}
          className={`flex items-center gap-2 w-full px-3 py-1.5 text-[11px] transition-colors ${
            (item as any).danger
              ? 'text-destructive hover:bg-destructive/10'
              : 'text-popover-foreground hover:bg-secondary'
          }`}
          role="menuitem"
        >
          <item.icon size={12} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
