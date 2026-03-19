import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";

const App = () => {
  // Hide to tray instead of closing the window
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        const unlisten = await appWindow.onCloseRequested(async (event) => {
          event.preventDefault();
          await appWindow.hide();
        });
        cleanup = unlisten;
      } catch {
        // Not running inside Tauri (browser dev mode) — skip
      }
    })();
    return () => cleanup?.();
  }, []);

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Index />
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default App;
