import { z } from "zod";
import { aliasesInput } from "@/modules/settings";

export const trackCompetitorInput = z.object({
  businessId: z.uuid(),
  name: z.string().trim().min(1).max(120),
});

// Other names for each tracked competitor (migration 055); the plan caps the list well under 50.
export const competitorAliasesInput = z.object({
  businessId: z.uuid(),
  competitors: z.array(z.object({ id: z.uuid(), aliases: aliasesInput })).max(50),
});
