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

// A website the user typed for a tracked competitor; empty removes it.
export const competitorWebsiteInput = z.object({
  businessId: z.uuid(),
  competitorId: z.uuid(),
  website: z.string().trim().max(200),
});

// "Check their website" (B-91): the domain is checked again on the server against the typed or cited ones.
export const checkWebsiteInput = z.object({
  businessId: z.string().uuid(),
  competitorId: z.string().uuid(),
  domain: z.string().trim().min(4).max(253),
});
