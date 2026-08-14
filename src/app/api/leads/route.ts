import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot check — silently discard bot submissions
  if (body._honey && String(body._honey).trim() !== "") {
    return NextResponse.json({ success: true });
  }

  // Validate and sanitize fields
  const full_name = typeof body.full_name === "string" ? body.full_name.trim().slice(0, 200) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 50) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 100) : null;
  const isCallBar = source === "call_bar";
  const business_name =
    typeof body.business_name === "string" && body.business_name.trim()
      ? body.business_name.trim().slice(0, 200)
      : isCallBar
        ? "Call Bar Lead"
        : "";
  let website =
    typeof body.website === "string" && body.website.trim()
      ? body.website.trim().slice(0, 500)
      : isCallBar
        ? "https://customers.direct/call-bar"
        : "";

  if (!full_name) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email address is required." }, { status: 400 });
  if (!EMAIL_REGEX.test(email)) return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  if (!business_name) return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  if (!website) return NextResponse.json({ error: "Website is required." }, { status: 400 });

  const callBarBusinessPhone =
    typeof body.call_bar_business_phone === "string"
      ? body.call_bar_business_phone.trim().slice(0, 50)
      : "";
  const callBarText =
    typeof body.call_bar_text === "string"
      ? body.call_bar_text.trim().slice(0, 80)
      : "";
  const colorPattern = /^#[0-9a-f]{6}$/i;
  const callBarBgColor =
    typeof body.call_bar_bg_color === "string" &&
    colorPattern.test(body.call_bar_bg_color)
      ? body.call_bar_bg_color
      : "#2563EB";
  const callBarTextColor =
    typeof body.call_bar_text_color === "string" &&
    colorPattern.test(body.call_bar_text_color)
      ? body.call_bar_text_color
      : "#FFFFFF";
  const referrerUrl =
    typeof body.referrer_url === "string"
      ? body.referrer_url.trim().slice(0, 1000)
      : null;

  if (isCallBar && !callBarBusinessPhone) {
    return NextResponse.json(
      { error: "Business phone number is required." },
      { status: 400 },
    );
  }
  if (isCallBar && !callBarText) {
    return NextResponse.json(
      { error: "Call Bar text is required." },
      { status: 400 },
    );
  }

  // Normalize website protocol
  if (!/^https?:\/\//i.test(website)) {
    website = "https://" + website;
  }
  const proto = website.match(/^([a-z]+):\/\//i)?.[1]?.toLowerCase();
  if (proto !== "http" && proto !== "https") {
    return NextResponse.json({ error: "Invalid website URL." }, { status: 400 });
  }

  // Optional extra fields (chat widget / future sources)
  const callBarFallback = isCallBar
    ? JSON.stringify({
        text: callBarText,
        backgroundColor: callBarBgColor,
        textColor: callBarTextColor,
      })
    : null;
  const business_type = isCallBar
    ? callBarBusinessPhone
    : typeof body.business_type === "string"
      ? body.business_type.trim().slice(0, 200)
      : null;
  const goal = isCallBar
    ? callBarFallback
    : typeof body.goal === "string"
      ? body.goal.trim().slice(0, 500)
      : null;

  const supabase = createServiceClient();

  // Core payload — always works regardless of schema version
  const corePayload = { full_name, phone, email, business_name, website };
  const legacyPayload = {
    ...corePayload,
    ...(source ? { source } : {}),
    ...(business_type ? { business_type } : {}),
    ...(goal ? { goal } : {}),
  };

  if (isCallBar) {
    const duplicateCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: duplicate } = await supabase
      .from("customers_direct_leads")
      .select("id")
      .eq("source", "call_bar")
      .eq("email", email)
      .gte("created_at", duplicateCutoff)
      .limit(1)
      .maybeSingle();
    if (duplicate) {
      return NextResponse.json({ success: true, leadId: duplicate.id });
    }
  }

  const extendedPayload = {
    ...legacyPayload,
    ...(isCallBar
      ? {
          call_bar_business_phone: callBarBusinessPhone,
          call_bar_text: callBarText,
          call_bar_bg_color: callBarBgColor,
          call_bar_text_color: callBarTextColor,
          referrer_url: referrerUrl,
        }
      : {}),
  };
  const { data, error } = await supabase
    .from("customers_direct_leads")
    .insert(extendedPayload)
    .select("id")
    .single();

  if (error) {
    // If the error is about unknown columns (migration not yet applied),
    // retry with only the core fields so the lead is never lost.
    const isSchemaMismatch =
      error.message.includes('column') ||
      error.message.includes('schema') ||
      error.code === 'PGRST204' ||
      error.code === '42703';

    if (isSchemaMismatch) {
      console.warn("Optional columns missing — retrying with legacy payload:", error.message);
      const { data: retryData, error: retryError } = await supabase
        .from("customers_direct_leads")
        .insert(legacyPayload)
        .select("id")
        .single();

      if (retryError) {
        const retryIsSchemaMismatch =
          retryError.message.includes("column") ||
          retryError.message.includes("schema") ||
          retryError.code === "PGRST204" ||
          retryError.code === "42703";
        if (!retryIsSchemaMismatch) {
          console.error("Supabase retry insert error:", retryError.message);
          return NextResponse.json({ error: "Failed to save lead." }, { status: 500 });
        }
        const { data: coreData, error: coreError } = await supabase
          .from("customers_direct_leads")
          .insert(corePayload)
          .select("id")
          .single();
        if (coreError) {
          console.error("Supabase core insert error:", coreError.message);
          return NextResponse.json({ error: "Failed to save lead." }, { status: 500 });
        }
        return NextResponse.json({ success: true, leadId: coreData.id });
      }
      return NextResponse.json({ success: true, leadId: retryData.id });
    } else {
      console.error("Supabase insert error:", error.message);
      return NextResponse.json({ error: "Failed to save lead." }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, leadId: data.id });
}
