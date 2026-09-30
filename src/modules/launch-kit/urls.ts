import "server-only";
import { env } from "@/lib/env";
import type { NextRequest } from "next/server";

export function appBaseUrl(request: NextRequest): string {
  return (
    env.NEXT_PUBLIC_APP_URL ??
    env.NEXT_PUBLIC_SITE_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  ).replace(/\/$/, "");
}
