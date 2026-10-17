import { NextResponse } from "next/server";
import { recordNewsletterEvent } from "@/modules/newsletter/dal";
import { isPlacement, signupHref } from "@/modules/newsletter/signup";

export async function GET(request: Request, context: { params: Promise<{ placement: string }> }) {
  const { placement } = await context.params;
  if (!isPlacement(placement)) {
    return NextResponse.redirect(new URL("/#newsletter", request.url));
  }
  await recordNewsletterEvent({ event: "click", placement });
  return NextResponse.redirect(signupHref(placement));
}
