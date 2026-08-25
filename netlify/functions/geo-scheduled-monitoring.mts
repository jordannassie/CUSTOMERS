/**
 * Netlify Scheduled Function — fires daily and hits the Next.js cron route,
 * which decides per-business whether a scan is actually due based on plan
 * cadence (see src/app/api/geo/cron/run-monitoring/route.ts). Running this
 * daily and letting the route self-throttle is simpler and safer than
 * trying to encode weekly/monthly cadences in the cron schedule itself.
 */
const handler = async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.GEO_CRON_SECRET;

  if (!siteUrl || !secret) {
    console.error("geo-scheduled-monitoring: missing URL or GEO_CRON_SECRET env var — skipping.");
    return new Response("Missing configuration", { status: 500 });
  }

  try {
    const response = await fetch(`${siteUrl}/api/geo/cron/run-monitoring`, {
      method: "POST",
      headers: { "x-cron-secret": secret },
    });
    const body = await response.text();
    console.log(`geo-scheduled-monitoring: status=${response.status} body=${body.slice(0, 2000)}`);
  } catch (error) {
    console.error("geo-scheduled-monitoring: request failed", error);
  }

  return new Response("ok");
};

export default handler;

// Netlify Scheduled Functions config — kept as a plain object (no
// @netlify/functions import) so this file has zero extra dependencies.
export const config = {
  schedule: "@daily",
};
