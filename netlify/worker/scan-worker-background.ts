// Netlify background function for the scan worker (B-27, D-41, D-42). pg_net calls it every minute; Netlify
// answers 202 straight away and this runs for up to 15 minutes. Built by scripts/build-worker.mjs, not from
// netlify/functions, because Netlify's bundler would load the real server-only package, which throws.
import { handleWorkerRequest } from "@/modules/jobs";

export default async function scanWorker(req: Request): Promise<Response> {
  const res = await handleWorkerRequest(req);
  console.log(`scan worker: ${res.status} ${await res.clone().text()}`);
  return res;
}
