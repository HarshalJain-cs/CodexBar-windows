import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { getAllUsage, refreshAll } from "@/lib/api";
import type { ProviderUsage } from "@/lib/types";

export function useUsageData() {
  const [providers, setProviders] = useState<ProviderUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getAllUsage();
      setProviders(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch usage data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await refreshAll();
      setProviders(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const unlisten = listen("usage-updated", () => {
      fetchData();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchData]);

  return { providers, loading, lastUpdated, refresh };
}
