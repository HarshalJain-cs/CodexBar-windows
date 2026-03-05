import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { getProviderStatus } from "@/lib/api";
import type { ProviderStatus } from "@/lib/types";

export function useProviderStatus() {
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({});

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const data = await getProviderStatus();
        const map: Record<string, ProviderStatus> = {};
        for (const s of data) {
          map[s.providerId] = s;
        }
        setStatuses(map);
      } catch (err) {
        console.error("Failed to fetch provider statuses:", err);
      }
    };

    fetchStatuses();

    const unlisten = listen("usage-updated", () => {
      fetchStatuses();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return statuses;
}
