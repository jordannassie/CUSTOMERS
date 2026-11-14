"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// The 404 page is prerendered once, so the server can't know the address that was opened. Reading it only in the
// browser keeps the server HTML and the first client render the same (no hydration error #418).
export function CurrentPath() {
  const path = useSyncExternalStore(
    noop,
    () => window.location.pathname,
    () => null,
  );
  return <>{path}</>;
}
