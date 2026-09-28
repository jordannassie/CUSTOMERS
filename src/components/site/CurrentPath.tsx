"use client";

import { usePathname } from "next/navigation";

export function CurrentPath() {
  return <>{usePathname()}</>;
}
