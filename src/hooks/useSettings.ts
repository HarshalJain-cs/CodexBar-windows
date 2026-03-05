import { useState, useEffect, useCallback } from "react";
import { getSettings, updateSettings as saveSettings } from "@/lib/api";
import type { Settings } from "@/lib/types";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateSettings = useCallback(
    async (updated: Settings) => {
      try {
        await saveSettings(updated);
        setSettings(updated);
      } catch (err) {
        console.error("Failed to save settings:", err);
      }
    },
    [],
  );

  return { settings, loading, updateSettings };
}
