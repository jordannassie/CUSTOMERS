"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard rules for a small dialog that is not a Radix one (the Mr. Direct chat, F-13): focus moves into it when it
 * opens, Tab and Shift+Tab stay inside it, Escape closes it, and focus goes back to what opened it when it closes.
 */
export function useDialogFocus<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const panel = useRef<T>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const items = () => (node ? [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null) : []);
    items()[0]?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const list = items();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !node?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !node?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener.current?.focus?.();
    };
  }, [open, onClose]);

  return panel;
}
