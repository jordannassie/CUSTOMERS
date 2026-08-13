"use client";

import { useCallback, useEffect, useState } from "react";

function localDateKey() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function useDailyCallCounter() {
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  const goal = 100;
  const day = localDateKey();
  const storageKey = `customers_direct_calls_${day}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);
      setCount(stored ? Math.max(0, Number.parseInt(stored, 10) || 0) : 0);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const setAndPersist = useCallback(
    (next: number) => {
      const safe = Math.max(0, next);
      setCount(safe);
      window.localStorage.setItem(storageKey, String(safe));
    },
    [storageKey],
  );

  const increment = useCallback(
    (placeId?: string) => {
      if (placeId) {
        const guardKey = `customers_direct_last_call_${day}`;
        const previous = window.localStorage.getItem(guardKey);
        const [previousId, previousTime] = previous?.split("|") ?? [];
        if (
          previousId === placeId &&
          Date.now() - Number(previousTime || 0) < 30_000
        ) {
          return;
        }
        window.localStorage.setItem(guardKey, `${placeId}|${Date.now()}`);
      }
      setCount((current) => {
        const next = current + 1;
        window.localStorage.setItem(storageKey, String(next));
        return next;
      });
    },
    [day, storageKey],
  );

  return {
    count: ready ? count : 0,
    goal,
    increment,
    decrement: () => setAndPersist(count - 1),
    manualIncrement: () => setAndPersist(count + 1),
  };
}
