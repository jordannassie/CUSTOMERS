import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "business-logos";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const businessId = formData.get("businessId") as string | null;

  if (!file || !businessId) {
    return NextResponse.json({ error: "file and businessId are required." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Logo must be under 2 MB." }, { status: 400 });
  }
  if (!["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPG, SVG, or WebP files are accepted." }, { status: 400 });
  }

  // Verify the business belongs to this user
  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .maybeSingle();

  if (!biz) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const service = createServiceClient();

  // Ensure bucket exists (idempotent — no-op if it already does)
  await service.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${user!.id}/${businessId}/logo.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("Logo upload failed:", uploadError.message);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }

  const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Persist to business record
  await supabase
    .from("businesses")
    .update({ logo_url: publicUrl })
    .eq("id", businessId)
    .eq("owner_user_id", user!.id);

  return NextResponse.json({ url: publicUrl });
}
