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
  const business_name = typeof body.business_name === "string" ? body.business_name.trim().slice(0, 200) : "";
  let website = typeof body.website === "string" ? body.website.trim().slice(0, 500) : "";

  if (!full_name) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email address is required." }, { status: 400 });
  if (!EMAIL_REGEX.test(email)) return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  if (!business_name) return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  if (!website) return NextResponse.json({ error: "Website is required." }, { status: 400 });

  // Normalize website protocol
  if (!/^https?:\/\//i.test(website)) {
    website = "https://" + website;
  }
  const proto = website.match(/^([a-z]+):\/\//i)?.[1]?.toLowerCase();
  if (proto !== "http" && proto !== "https") {
    return NextResponse.json({ error: "Invalid website URL." }, { status: 400 });
  }

  // Optional extra fields (chat widget / future sources)
  const source        = typeof body.source        === "string" ? body.source.trim().slice(0, 100)  : null;
  const business_type = typeof body.business_type === "string" ? body.business_type.trim().slice(0, 200) : null;
  const goal          = typeof body.goal          === "string" ? body.goal.trim().slice(0, 500)    : null;

  const supabase = createServiceClient();
  const { error } = await supabase.from("customers_direct_leads").insert({
    full_name,
    phone,
    email,
    business_name,
    website,
    ...(source        ? { source }        : {}),
    ...(business_type ? { business_type } : {}),
    ...(goal          ? { goal }          : {}),
  });

  if (error) {
    console.error("Supabase insert error:", error.message);
    return NextResponse.json({ error: "Failed to save lead." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
