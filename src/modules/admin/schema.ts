import { z } from "zod";

// Actions are "<thing>.<verb>" so the log can be filtered by area, e.g. "lead.update".
export const adminActionInput = z.object({
  action: z.string().regex(/^[a-z_]+\.[a-z_]+$/),
  target: z.object({
    type: z.string().min(1).max(50),
    id: z.string().min(1).max(200).nullable().default(null),
  }),
  details: z.record(z.string(), z.json()).default({}),
});

export type AdminActionInput = z.input<typeof adminActionInput>;
export type AdminTarget = AdminActionInput["target"];
export type AdminActionDetails = NonNullable<AdminActionInput["details"]>;
