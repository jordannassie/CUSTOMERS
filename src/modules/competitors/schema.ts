import { z } from "zod";

export const trackCompetitorInput = z.object({
  businessId: z.uuid(),
  name: z.string().trim().min(1).max(120),
});
