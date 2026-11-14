import { connection } from "next/server";
import { pingDatabase } from "@/modules/system-status";

// Uptime check for the monitor (Better Stack): 200 when the app can reach its database, 503 when not. Public on
// purpose; it returns no data. connection() keeps it from being prerendered at build time (Cache Components).
export async function GET() {
  await connection();
  const ok = await pingDatabase();
  return Response.json({ ok }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
