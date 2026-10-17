import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { NewsletterPlacement } from "./signup";

function missingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /newsletter_events/i.test(error.message ?? "");
}

export async function recordNewsletterEvent(input: { event: "impression" | "click"; placement: NewsletterPlacement }): Promise<void> {
  try {
    const svc = createServiceClient();
    const { error } = await svc.from("newsletter_events").insert({
      event: input.event,
      placement: input.placement,
    });
    if (error && !missingTable(error)) console.error("[newsletter]", error.code, error.message);
  } catch (error) {
    console.error("[newsletter]", error instanceof Error ? error.message : "unknown");
  }
}
