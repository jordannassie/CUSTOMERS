import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getVideoAdPackage, type VideoAdPackageId } from "./packages";

type BriefCopy = {
  businessName: string;
  websiteUrl: string;
  product: string;
  audience: string;
  creativeInstructions: string;
  assetUrl: string | null;
};

export function leadNoteKey(sessionId: string) {
  return `video_ad:${sessionId}`;
}

export function briefLeadMessage(packageId: VideoAdPackageId, amountCents: number, brief: BriefCopy) {
  const pack = getVideoAdPackage(packageId);
  const lines = [
    `Paid ${pack?.name ?? packageId} package ($${amountCents / 100}), one-time.`,
    `Business: ${brief.businessName}`,
    `Website: ${brief.websiteUrl}`,
    `Product: ${brief.product}`,
    `Target audience: ${brief.audience}`,
    `Creative instructions: ${brief.creativeInstructions}`,
    brief.assetUrl ? `Asset link: ${brief.assetUrl}` : "Asset link: none",
  ];
  return lines.join("\n").slice(0, 5000);
}

/** Copies the order into Leads so an admin can read it before the orders table exists. */
export async function mirrorLead(input: {
  sessionId: string;
  name: string;
  email: string;
  businessName: string | null;
  websiteUrl: string | null;
  message: string;
  mode: "payment" | "brief";
}) {
  const svc = createServiceClient();
  const notes = leadNoteKey(input.sessionId);
  const { data: existing, error: readError } = await svc
    .from("contact_submissions")
    .select("id")
    .eq("notes", notes)
    .maybeSingle();
  if (readError) return false;
  if (existing && input.mode === "payment") return true;

  const shared = {
    name: input.name.slice(0, 200),
    email: input.email.slice(0, 254),
    company: input.businessName?.slice(0, 200) ?? null,
    website: input.websiteUrl?.slice(0, 500) ?? null,
    topic: "sales" as const,
    message: input.message.slice(0, 5000),
    source: "video_ad",
    page_path: "/ads",
  };

  const { error } = existing
    ? await svc.from("contact_submissions").update(shared).eq("id", existing.id)
    : await svc.from("contact_submissions").insert({ ...shared, notes, status: "new" });
  return !error;
}
