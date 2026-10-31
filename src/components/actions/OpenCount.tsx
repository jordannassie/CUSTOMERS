"use client";

import { useOpenCount } from "./open-count";

/** "N open." in the Actions header, following the board's moves as they happen. */
export function OpenCount({ businessId, initial }: { businessId: string; initial: number }) {
  const open = useOpenCount(businessId, initial);
  return <span data-testid="to-do-count"> {open === 0 ? "You have done or dismissed every fix." : `${open} open.`}</span>;
}
