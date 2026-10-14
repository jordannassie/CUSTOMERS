import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, clientIp } from "@/modules/rate-limit";
import {
  compareSites,
  extractDomain,
  isSafePublicUrl,
  readSite,
  readinessCheckInput,
} from "@/modules/readiness-check";

/**
 * Public AI readiness check (D-83): reads two home pages and scores their website basics.
 * No AI calls. Public by design, so it is rate limited per IP instead of checking auth.
 */
export async function POST(request: NextRequest) {
  const limit = await checkRateLimit("compare", clientIp(request.headers));
  if (limit === "limited") return NextResponse.json({ error: "Too many checks. Try again in an hour." }, { status: 429 });
  if (limit === "unavailable") return NextResponse.json({ error: "The check is busy right now. Try again in a few minutes." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const parsed = readinessCheckInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { myUrl, competitorUrl } = parsed.data;

  if (!isSafePublicUrl(myUrl)) {
    return NextResponse.json({ error: "Enter your website, for example yourbusiness.com." }, { status: 400 });
  }
  if (!isSafePublicUrl(competitorUrl)) {
    return NextResponse.json({ error: "Enter a competitor's website, for example competitor.com." }, { status: 400 });
  }
  const myDomain = extractDomain(myUrl);
  const themDomain = extractDomain(competitorUrl);
  if (myDomain === themDomain) {
    return NextResponse.json({ error: "Enter a different website for your competitor." }, { status: 400 });
  }

  const [mine, them] = await Promise.all([readSite(myUrl), readSite(competitorUrl)]);
  return NextResponse.json(compareSites({ domain: myDomain, ...mine }, { domain: themDomain, ...them }));
}
