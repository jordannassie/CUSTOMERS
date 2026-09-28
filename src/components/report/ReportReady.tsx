"use client";

import { useEffect, useState } from "react";

// Charts measure their box after hydration, so wait until each one has drawn its lines.
const drawn = () =>
  [...document.querySelectorAll("[data-chart]")].every((chart) => chart.querySelector(".recharts-surface path"));
const GIVE_UP_MS = 5000;

/** Adds `data-report-ready` once the charts have drawn; the PDF export waits for it (B-60, D-71). */
export function ReportReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const check = () => {
      if (drawn() || performance.now() - start > GIVE_UP_MS) return setReady(true);
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, []);

  return ready ? <div data-report-ready hidden /> : null;
}
