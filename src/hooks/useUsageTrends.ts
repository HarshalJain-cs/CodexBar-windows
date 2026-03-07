import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { getUsageTrends } from "@/lib/api";
import type { UsageTrend } from "@/lib/types";

export function useUsageTrends() {
  const [trends, setTrends] = useState<Record<string, UsageTrend>>({});

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const data = await getUsageTrends();
        const map: Record<string, UsageTrend> = {};
        for (const t of data) {
          map[t.providerId] = t;
        }
        setTrends(map);
      } catch (err) {
        console.error("Failed to fetch usage trends:", err);
      }
    };

    fetchTrends();

    const unlisten = listen("usage-updated", () => {
      fetchTrends();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return trends;
}
