import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { requireStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { getVideoAdPackage } from "@/modules/video-ads/packages";
import { packageIdSchema } from "@/modules/video-ads/schema";

function siteBase(request: NextRequest) {
  return (
    env.NEXT_PUBLIC_APP_URL ??
    env.NEXT_PUBLIC_SITE_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  );
}

/** Public one-time checkout. Package price comes from the server catalog. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = packageIdSchema.safeParse(
    body && typeof body === "object" && "packageId" in body ? body.packageId : undefined,
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose Starter, Growth, or Scale." }, { status: 400 });
  }

  const pack = getVideoAdPackage(parsed.data);
  if (!pack) {
    return NextResponse.json({ error: "Choose Starter, Growth, or Scale." }, { status: 400 });
  }

  let stripe: ReturnType<typeof requireStripe>;
  try {
    stripe = requireStripe();
  } catch {
    return NextResponse.json(
      { error: "Online checkout is not connected yet. You have not been charged.", configured: false },
      { status: 503 },
    );
  }

  const token = randomBytes(16).toString("hex");
  const base = siteBase(request).replace(/\/$/, "");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.amountCents,
            product_data: {
              name: pack.checkoutName,
              description: "One-time AI video ad purchase. This is not a subscription.",
            },
          },
        },
      ],
      success_url: `${base}/ads/brief?session_id={CHECKOUT_SESSION_ID}&token=${token}`,
      cancel_url: `${base}/ads?checkout=cancelled`,
      metadata: {
        kind: "video_ad",
        package_id: pack.id,
        brief_token: token,
      },
      payment_intent_data: {
        metadata: {
          kind: "video_ad",
          package_id: pack.id,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout could not be started. You have not been charged." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[video-ads] checkout:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Checkout could not be started. You have not been charged." },
      { status: 502 },
    );
  }
}
