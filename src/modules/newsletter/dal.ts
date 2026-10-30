import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { NewsletterPlacement } from "./signup";
import { isMissingTable } from "@/lib/supabase/missing-table";

const missingTable = (error: { code?: string; message?: string } | null) => isMissingTable(error, /newsletter_events/i);

export async function recordNewsletterEvent(input: { event: "impression" | "click" | "confirmed"; placement: NewsletterPlacement }): Promise<void> {
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
