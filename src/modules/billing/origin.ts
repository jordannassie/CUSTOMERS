import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/** The app's own origin for Stripe return URLs: the configured URL, else the request's host. */
export async function appOrigin(): Promise<string> {
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
