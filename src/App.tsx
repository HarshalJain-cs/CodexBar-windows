import { useState, useEffect } from "react";
import { MainWindow } from "./pages/MainWindow";
import { Settings } from "./pages/Settings";
import { useSettings } from "./hooks/useSettings";

type View = "main" | "settings";

function App() {
  const [view, setView] = useState<View>("main");
  const { settings } = useSettings();

  // Apply theme to document root
  useEffect(() => {
    const theme = settings?.theme ?? "light";
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");

      const listener = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
      };
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [settings?.theme]);

  if (view === "settings") {
    return <Settings onBack={() => setView("main")} />;
  }

  return <MainWindow onOpenSettings={() => setView("settings")} />;
}

export default App;
