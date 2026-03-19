import { useState, useEffect } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface UpdateBannerProps {
    animationsEnabled: boolean;
}

interface UpdateInfo {
    version: string;
    date: string;
    body: string;
}

export default function UpdateBanner({ animationsEnabled }: UpdateBannerProps) {
    const [update, setUpdate] = useState<UpdateInfo | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        checkForUpdate();
    }, []);

    const checkForUpdate = async () => {
        try {
            const { check } = await import('@tauri-apps/plugin-updater');
            const result = await check();
            if (result?.available) {
                setUpdate({
                    version: result.version,
                    date: result.date ?? '',
                    body: result.body ?? '',
                });
            }
        } catch {
            // Not running in Tauri or updater not configured — skip
        }
    };

    const installUpdate = async () => {
        setInstalling(true);
        try {
            const { check } = await import('@tauri-apps/plugin-updater');
            const result = await check();
            if (result?.available) {
                await result.downloadAndInstall();
                toast.success('Update installed! Restart to apply.');
            }
        } catch {
            toast.error('Failed to install update');
        }
        setInstalling(false);
    };

    if (!update || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={animationsEnabled ? { height: 0, opacity: 0 } : undefined}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-primary/20 bg-primary/5"
            >
                <div className="flex items-center gap-2 px-3 py-2 text-xs">
                    <Download size={12} className="text-primary flex-shrink-0" />
                    <span className="flex-1 text-card-foreground">
                        <span className="font-semibold">v{update.version}</span> available
                    </span>
                    <button
                        onClick={installUpdate}
                        disabled={installing}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {installing ? (
                            <RefreshCw size={10} className="animate-spin" />
                        ) : (
                            <Download size={10} />
                        )}
                        {installing ? 'Installing...' : 'Update'}
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Dismiss update"
                    >
                        <X size={10} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Export the check function for use in settings
export async function checkForUpdateManual(): Promise<string | null> {
    try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const result = await check();
        if (result?.available) {
            return result.version;
        }
        return null;
    } catch {
        return null;
    }
}
