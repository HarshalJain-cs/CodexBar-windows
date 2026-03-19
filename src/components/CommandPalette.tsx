import { useState, useEffect, useRef, useCallback } from 'react';
import { Command, Search, Settings, RefreshCw, Download, Eye, EyeOff, BarChart3, Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandAction {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    shortcut?: string;
    action: () => void;
}

interface CommandPaletteProps {
    actions: CommandAction[];
    isOpen: boolean;
    onClose: () => void;
}

export default function CommandPalette({ actions, isOpen, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = query
        ? actions.filter(
            a =>
                a.label.toLowerCase().includes(query.toLowerCase()) ||
                a.description.toLowerCase().includes(query.toLowerCase())
        )
        : actions;

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i < filtered.length - 1 ? i + 1 : 0));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i > 0 ? i - 1 : filtered.length - 1));
            } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                e.preventDefault();
                filtered[selectedIndex].action();
                onClose();
            } else if (e.key === 'Escape') {
                onClose();
            }
        },
        [filtered, selectedIndex, onClose]
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-start justify-center pt-[20%] bg-background/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-[360px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden mx-3"
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Search input */}
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                        <Command size={14} className="text-muted-foreground" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a command..."
                            className="flex-1 bg-transparent text-xs text-card-foreground placeholder:text-muted-foreground outline-none"
                        />
                        <kbd className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border font-mono">
                            ESC
                        </kbd>
                    </div>

                    {/* Results */}
                    <div className="max-h-[240px] cb-scroll-area py-1">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                No commands found
                            </div>
                        ) : (
                            filtered.map((action, index) => (
                                <button
                                    key={action.id}
                                    onClick={() => {
                                        action.action();
                                        onClose();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${index === selectedIndex
                                            ? 'bg-primary/10 text-card-foreground'
                                            : 'text-card-foreground hover:bg-secondary/50'
                                        }`}
                                >
                                    <div className="flex-shrink-0 text-muted-foreground">{action.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate">{action.label}</div>
                                        <div className="text-[10px] text-muted-foreground truncate">
                                            {action.description}
                                        </div>
                                    </div>
                                    {action.shortcut && (
                                        <kbd className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border font-mono flex-shrink-0">
                                            {action.shortcut}
                                        </kbd>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// Pre-built action factory
export function useCommandActions({
    onRefresh,
    onOpenSettings,
    onExportSettings,
    onTogglePrivacy,
    onOpenAlerts,
    onCheckUpdates,
    privacyMode,
}: {
    onRefresh: () => void;
    onOpenSettings: () => void;
    onExportSettings: () => void;
    onTogglePrivacy: () => void;
    onOpenAlerts: () => void;
    onCheckUpdates: () => void;
    privacyMode: boolean;
}): CommandAction[] {
    return [
        {
            id: 'refresh',
            label: 'Refresh All',
            description: 'Refresh all provider data',
            icon: <RefreshCw size={14} />,
            shortcut: 'Ctrl+R',
            action: onRefresh,
        },
        {
            id: 'settings',
            label: 'Open Settings',
            description: 'Configure CodexBar preferences',
            icon: <Settings size={14} />,
            shortcut: 'Ctrl+,',
            action: onOpenSettings,
        },
        {
            id: 'export',
            label: 'Export Settings',
            description: 'Download settings as JSON',
            icon: <Download size={14} />,
            shortcut: 'Ctrl+E',
            action: onExportSettings,
        },
        {
            id: 'privacy',
            label: privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode',
            description: 'Toggle usage data visibility',
            icon: privacyMode ? <Eye size={14} /> : <EyeOff size={14} />,
            action: onTogglePrivacy,
        },
        {
            id: 'alerts',
            label: 'Alerts History',
            description: 'View past threshold alerts',
            icon: <Bell size={14} />,
            action: onOpenAlerts,
        },
        {
            id: 'updates',
            label: 'Check for Updates',
            description: 'Check if a new version is available',
            icon: <BarChart3 size={14} />,
            action: onCheckUpdates,
        },
    ];
}
