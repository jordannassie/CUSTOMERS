"use client";

import { useEffect, useRef } from "react";

/** A sideways scroll area that opens at its right end, where the newest scan is, when it is too narrow to show all. */
export function ScrollToNewest({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
