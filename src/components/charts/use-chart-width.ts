"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The rendered width of a chart's box, in px, so the chart can draw at that width and keep a fixed height. Without it an
 * SVG with a fixed viewBox grows taller as its card gets wider. `fallback` is used on the server and the first paint.
 */
export function useChartWidth<T extends HTMLElement>(fallback: number, min = 0) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(min, Math.round(el.getBoundingClientRect().width)) || fallback);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fallback, min]);
  return [ref, width] as const;
}
