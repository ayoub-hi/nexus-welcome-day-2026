"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 4000;

/** Poll the live, DB-backed event status: "not_started" | "open" | "ended". */
export function useGameStatus() {
  const [status, setStatus] = useState(null); // null while loading the first poll

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/game-state");
        const data = await res.json();
        if (!cancelled && data?.status) setStatus(data.status);
      } catch {
        // transient network hiccup - just try again next tick
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}
