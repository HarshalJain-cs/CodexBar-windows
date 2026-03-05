import { useState } from "react";
import { MainWindow } from "./pages/MainWindow";
import { Settings } from "./pages/Settings";

type View = "main" | "settings";

function App() {
  const [view, setView] = useState<View>("main");

  if (view === "settings") {
    return <Settings onBack={() => setView("main")} />;
  }

  return <MainWindow onOpenSettings={() => setView("settings")} />;
}

export default App;
