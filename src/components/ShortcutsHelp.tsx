import { X, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

const shortcuts = [
    { keys: 'Ctrl + K', description: 'Open command palette' },
    { keys: 'Ctrl + R', description: 'Refresh all providers' },
    { keys: 'Ctrl + ,', description: 'Open / close settings' },
    { keys: 'Ctrl + E', description: 'Export settings' },
    { keys: '1 – 9', description: 'Refresh provider by position' },
    { keys: '?', description: 'Show this help overlay' },
    { keys: 'Esc', description: 'Close dialog / palette' },
];

export default function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-[320px] rounded-xl border border-border bg-card shadow-2xl mx-3 overflow-hidden"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                            <Keyboard size={14} className="text-primary" />
                            <span className="text-sm font-semibold text-card-foreground">Keyboard Shortcuts</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="p-3 space-y-1">
                        {shortcuts.map(s => (
                            <div key={s.keys} className="flex items-center justify-between py-1.5">
                                <span className="text-xs text-muted-foreground">{s.description}</span>
                                <kbd className="text-[10px] font-mono text-card-foreground bg-secondary px-2 py-0.5 rounded border border-border">
                                    {s.keys}
                                </kbd>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
