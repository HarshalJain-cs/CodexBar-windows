import { AppSettings, NotificationType, NotificationSound } from '@/types';

interface NotificationPreviewProps {
  settings: AppSettings;
  onTestNotification: () => void;
}

export default function NotificationPreview({ settings, onTestNotification }: NotificationPreviewProps) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-card-foreground">Notification Preview</div>

      {/* Mock toast preview */}
      <div className="rounded-lg border border-border bg-secondary p-3 relative">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/20 flex items-center justify-center text-primary text-sm flex-shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-card-foreground">CodexBar</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Codex usage at 85% — only 15% session remaining
            </div>
          </div>
        </div>
        <div className="absolute top-1 right-1.5 text-[8px] text-muted-foreground">Preview</div>
      </div>

      <button
        onClick={onTestNotification}
        className="w-full rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        Test Notification
      </button>
    </div>
  );
}
