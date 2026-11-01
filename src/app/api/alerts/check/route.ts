import { handleAlertsRequest } from "@/modules/admin";

// Called by pg_cron through pg_net every 15 minutes (B-69, MVP_SPEC 22); the worker secret header is the auth.
export async function POST(request: Request) {
  return handleAlertsRequest(request);
}
