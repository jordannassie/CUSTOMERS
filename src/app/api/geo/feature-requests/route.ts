import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_TITLE = 200;
const MAX_DESC  = 2000;

export async function POST(request: NextRequest) {
  // 1. Verify authenticated user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, description, businessId, pageContext } = body as {
    title?: string;
    description?: string;
    businessId?: string;
    pageContext?: string;
  };

  const trimmedTitle = (title ?? "").trim();
  const trimmedDesc  = (description ?? "").trim();

  if (!trimmedTitle) {
    return NextResponse.json({ error: "Feature title is required." }, { status: 400 });
  }
  if (trimmedTitle.length > MAX_TITLE) {
    return NextResponse.json({ error: `Title must be ${MAX_TITLE} characters or fewer.` }, { status: 400 });
  }
  if (!trimmedDesc) {
    return NextResponse.json({ error: "Please describe the feature." }, { status: 400 });
  }
  if (trimmedDesc.length > MAX_DESC) {
    return NextResponse.json({ error: `Description must be ${MAX_DESC} characters or fewer.` }, { status: 400 });
  }

  // 3. Validate businessId belongs to this user (if provided)
  let validatedBusinessId: string | null = null;
  if (businessId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (biz) validatedBusinessId = biz.id;
  }

  // 4. Insert using service client so RLS never blocks a valid authenticated request
  const svc = createServiceClient();
  const { error: insertError } = await svc
    .from("feature_requests")
    .insert({
      user_id:      user.id,
      business_id:  validatedBusinessId,
      title:        trimmedTitle,
      description:  trimmedDesc,
      page_context: (pageContext ?? "").slice(0, 200) || null,
      status:       "new",
    });

  if (insertError) {
    console.error("[feature-requests] insert error:", insertError.message, insertError.code);
    return NextResponse.json(
      { error: "Failed to save suggestion. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
