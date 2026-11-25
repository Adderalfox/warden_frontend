"use client";

import { useEffect, useState } from "react";
import { IncidentState, getIncident, incidentStreamUrl } from "@/lib/api";

const TERMINAL = ["COMPLETED", "FAILED"];

export function useIncidentStream(incidentId: string) {
  const [state, setState] = useState<IncidentState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let es: EventSource | null = null;

    const apply = (next: IncidentState) => {
      if (cancelled) return;
      setState(next);
      if (TERMINAL.includes(next.status)) {
        if (timer) clearInterval(timer);
        timer = null;
      }
    };

    const poll = async () => {
      try {
        apply(await getIncident(incidentId));
      } catch {
        // transient fetch error; the next tick retries
      }
    };

    // 1) Load immediately over REST, then poll every 2s until terminal.
    poll();
    timer = setInterval(poll, 2000);

    // 2) Open the stream directly to the backend for instant updates.
    es = new EventSource(incidentStreamUrl(incidentId));
    const handle = (evt: MessageEvent) => {
      try {
        apply(JSON.parse(evt.data) as IncidentState);
      } catch {
        // ignore malformed frames
      }
    };
    es.addEventListener("snapshot", handle);
    es.addEventListener("done", handle);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      es?.close();
    };
  }, [incidentId]);

  return { state, connected };
}