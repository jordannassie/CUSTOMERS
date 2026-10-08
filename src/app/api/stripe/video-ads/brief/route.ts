import { NextResponse, type NextRequest } from "next/server";
import { saveBrief } from "@/modules/video-ads/dal";
import { briefSchema, briefTokensMatch, normalizeHttpUrl } from "@/modules/video-ads/schema";
import { loadPaidVideoAdSession } from "@/modules/video-ads/verify-session";

/** Public brief form. Payment is confirmed with Stripe before anything is saved. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body && typeof body === "object" && "_honey" in body && String(body._honey ?? "").trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const parsed = briefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }

  const websiteUrl = normalizeHttpUrl(parsed.data.websiteUrl);
  if (!websiteUrl) {
    return NextResponse.json({ error: "Enter a valid website address." }, { status: 400 });
  }

  const assetRaw = parsed.data.assetUrl?.trim() ?? "";
  const assetUrl = assetRaw ? normalizeHttpUrl(assetRaw) : null;
  if (assetRaw && !assetUrl) {
    return NextResponse.json({ error: "The asset link needs to be a normal web address." }, { status: 400 });
  }

  const paid = await loadPaidVideoAdSession(parsed.data.sessionId);
  if (!paid.ok) {
    const message =
      paid.reason === "unavailable"
        ? "Checkout is not connected, so this brief cannot be saved."
        : "We could not confirm a paid order for this link.";
    return NextResponse.json({ error: message }, { status: paid.reason === "unavailable" ? 503 : 402 });
  }

  if (!briefTokensMatch(paid.session.briefToken, parsed.data.token)) {
    return NextResponse.json({ error: "This order link is not valid." }, { status: 403 });
  }

  try {
    const saved = await saveBrief({
      sessionId: parsed.data.sessionId,
      paymentIntentId: paid.session.paymentIntentId,
      packageId: paid.session.pack.id,
      amountCents: paid.session.pack.amountCents,
      brief: {
        customerName: parsed.data.customerName,
        email: parsed.data.email,
        businessName: parsed.data.businessName,
        websiteUrl,
        product: parsed.data.product,
        audience: parsed.data.audience,
        creativeInstructions: parsed.data.creativeInstructions,
        assetUrl,
      },
    });
    return NextResponse.json({ ok: true, already: saved.already, packageName: paid.session.pack.name });
  } catch (error) {
    console.error("[video-ads] brief:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "We could not save your brief. Try again." }, { status: 500 });
  }
}
