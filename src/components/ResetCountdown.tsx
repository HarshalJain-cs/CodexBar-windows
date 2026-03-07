import { useState, useEffect } from "react";

interface ResetCountdownProps {
  resetsAt?: string;
  format?: "relative" | "absolute";
  description?: string;
}

export function ResetCountdown({ resetsAt, format = "relative", description }: ResetCountdownProps) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!resetsAt) {
      setText(description || "");
      return;
    }

    const update = () => {
      const reset = new Date(resetsAt);
      const now = new Date();
      const diff = reset.getTime() - now.getTime();

      if (diff <= 0) {
        setText("Resetting now");
        return;
      }

      if (format === "absolute") {
        setText(`Resets at ${reset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setText(`Resets in ${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setText(`Resets in ${hours}h ${mins}m`);
      } else {
        setText(`Resets in ${mins}m`);
      }
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [resetsAt, format, description]);

  if (!text) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{text}</span>
    </div>
  );
}
