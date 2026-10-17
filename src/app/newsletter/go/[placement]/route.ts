import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { recordNewsletterEvent } from "@/modules/newsletter/dal";
import { isPlacement, signupHref } from "@/modules/newsletter/signup";

export async function GET(_request: Request, context: { params: Promise<{ placement: string }> }) {
  const { placement } = await context.params;
  if (!isPlacement(placement)) {
    const origin = env.NEXT_PUBLIC_SITE_URL ?? "https://customers.direct";
    return NextResponse.redirect(new URL("/#newsletter", origin));
  }
  await recordNewsletterEvent({ event: "click", placement });
  return NextResponse.redirect(signupHref(placement));
}
