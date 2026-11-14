import { env } from "@/lib/env";
import { handleWorkerRequest } from "@/modules/jobs/server";

// The scan worker for LOCAL development only: pg_cron in the local Supabase calls it through pg_net at
// http://host.docker.internal:3000/api/dev/scan-worker (scripts/dev/setup-local-vault.sql). Hosted sites use the
// Netlify background function, which may run 15 minutes; this route answers 404 in production. The worker secret
// header is the auth, the same check as the Netlify function.
export async function POST(request: Request) {
  if (env.NODE_ENV === "production") return Response.json({ error: "Not found" }, { status: 404 });
  return handleWorkerRequest(request);
}
