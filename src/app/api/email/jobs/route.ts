import { handleEmailJobRequest } from "@/modules/notifications";

// Called by pg_cron through pg_net (run_email_job, B-62); the worker secret header is the auth.
export async function POST(request: Request) {
  return handleEmailJobRequest(request);
}
