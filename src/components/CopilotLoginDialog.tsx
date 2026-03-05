import { useState, useEffect, useRef } from "react";
import { startCopilotDeviceFlow, pollCopilotDeviceFlow, openUrl } from "@/lib/api";

interface CopilotLoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type FlowState = "idle" | "loading" | "waiting" | "success" | "error";

export function CopilotLoginDialog({ open, onClose, onSuccess }: CopilotLoginDialogProps) {
  const [state, setState] = useState<FlowState>("idle");
  const [userCode, setUserCode] = useState("");
  const [verificationUri, setVerificationUri] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setState("idle");
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [open]);

  const startFlow = async () => {
    setState("loading");
    setError("");
    try {
      const response = await startCopilotDeviceFlow();
      setUserCode(response.userCode);
      setVerificationUri(response.verificationUri);
      setState("waiting");

      // Start polling
      const interval = (response.interval || 5) * 1000;
      pollingRef.current = setInterval(async () => {
        try {
          const token = await pollCopilotDeviceFlow(response.deviceCode);
          if (token) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setState("success");
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 1500);
          }
        } catch {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setState("error");
          setError("Authorization failed or expired");
        }
      }, interval);

      // Auto-expire
      setTimeout(() => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        if (state === "waiting") {
          setState("error");
          setError("Device code expired. Please try again.");
        }
      }, (response.expiresIn || 900) * 1000);
    } catch (err) {
      setState("error");
      setError(String(err));
    }
  };

  const copyCode = async () => {
    try {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
      await writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Sign in to GitHub Copilot</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {state === "idle" && (
          <div className="text-center space-y-3">
            <p className="text-xs text-zinc-400">
              Connect your GitHub account to track Copilot usage.
            </p>
            <button
              onClick={startFlow}
              className="w-full text-xs px-3 py-2 rounded-md bg-zinc-100 text-zinc-900 font-medium hover:bg-white transition-colors"
            >
              Start GitHub Sign In
            </button>
          </div>
        )}

        {state === "loading" && (
          <div className="flex items-center justify-center py-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-zinc-400">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        )}

        {state === "waiting" && (
          <div className="space-y-3 text-center">
            <p className="text-xs text-zinc-400">
              Enter this code on GitHub:
            </p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-2xl font-mono font-bold tracking-widest text-zinc-100">
                {userCode}
              </code>
              <button
                onClick={copyCode}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                title="Copy code"
              >
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                )}
              </button>
            </div>
            <button
              onClick={() => openUrl(verificationUri)}
              className="w-full text-xs px-3 py-2 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              Open GitHub →
            </button>
            <div className="flex items-center justify-center gap-1.5 text-zinc-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className="text-[10px]">Waiting for authorization...</span>
            </div>
          </div>
        )}

        {state === "success" && (
          <div className="text-center py-2 space-y-2">
            <div className="text-2xl">🎉</div>
            <p className="text-xs text-green-400">Successfully connected!</p>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-3 text-center">
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={startFlow}
              className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
