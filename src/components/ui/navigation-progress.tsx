"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Phase = "idle" | "start" | "loading" | "done";

/** Shown only when the next page takes longer than this, so fast clicks don't flash a bar. */
const SHOW_AFTER_MS = 100;
/** A link whose click is cancelled (a disabled tab) never changes the address; the bar gives up after this. */
const GIVE_UP_MS = 10_000;

/** A click on a same-site link to another page or filter, the kind that leaves the screen unchanged while it loads. */
function opensAnotherPage(event: MouseEvent): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const link = (event.target as Element | null)?.closest?.("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return false;
  if ((link.target && link.target !== "_self") || link.hasAttribute("download") || link.getAttribute("aria-disabled") === "true") return false;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

/**
 * A thin bar along the top of the window while the next page loads. Server pages and filters in the address
 * (?range=, ?status=) changed nothing on screen for 0.6 to 1.9 s after a click, so people clicked again (BUG-307,
 * BUG-326). It starts on a link click and finishes when the address changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    // Capture phase: Next's Link cancels the click's default action, so a bubbling listener can't tell it from a
    // cancelled one.
    const onClick = (event: MouseEvent) => {
      if (!opensAnotherPage(event)) return;
      clear();
      timers.current.push(
        window.setTimeout(() => {
          setPhase("start");
          requestAnimationFrame(() => setPhase("loading"));
        }, SHOW_AFTER_MS),
        window.setTimeout(() => setPhase("idle"), GIVE_UP_MS),
      );
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clear();
    };
  }, []);

  // The new page is here: fill the bar, then fade it out (from timers, not in the effect body).
  useEffect(() => {
    clear();
    timers.current.push(
      window.setTimeout(() => setPhase((p) => (p === "idle" ? p : "done")), 0),
      window.setTimeout(() => setPhase("idle"), 300),
    );
  }, [pathname, search]);

  if (phase === "idle") return null;
  const width = phase === "start" ? "0%" : phase === "loading" ? "85%" : "100%";
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5" data-testid="navigation-progress">
      <div
        className="h-full bg-primary"
        style={{
          width,
          opacity: phase === "done" ? 0 : 1,
          transition: phase === "start" ? "none" : phase === "loading" ? "width 4s cubic-bezier(0.1, 0.6, 0.2, 1)" : "width 150ms ease-out, opacity 200ms ease-out 100ms",
        }}
      />
    </div>
  );
}
