import { useState, useEffect } from "react";
import { getProviderStatus } from "@/lib/api";
import { isTauri } from "@/lib/mockData";
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

    if (isTauri()) {
      import("@tauri-apps/api/event").then(({ listen }) => {
        const unlisten = listen("usage-updated", () => {
          fetchStatuses();
        });
        return () => {
          unlisten.then((fn) => fn());
        };
      });
    }
  }, []);

  return statuses;
}
