import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { recordNewsletterEvent } from "@/modules/newsletter/dal";
import { checkRateLimit, clientIp } from "@/modules/rate-limit";
import { isPlacement, signupHref } from "@/modules/newsletter/signup";

export async function GET(request: Request, context: { params: Promise<{ placement: string }> }) {
  const { placement } = await context.params;
  if (!isPlacement(placement)) {
    const origin = env.NEXT_PUBLIC_SITE_URL ?? "https://customers.direct";
    return NextResponse.redirect(new URL("/#newsletter", origin));
  }
  // The visitor always goes on to the signup page; a burst of clicks from one address is just not counted.
  if ((await checkRateLimit("newsletter", clientIp(request.headers))) === "allowed") await recordNewsletterEvent({ event: "click", placement });
  return NextResponse.redirect(signupHref(placement));
}
