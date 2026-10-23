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

// Admin list pages (Agencies, Businesses): 50 rows a page, a page number and a search box in the URL.
export const ADMIN_PAGE_SIZE = 50;

export const pageParam = z.coerce.number().int().min(1).max(10_000).catch(1);

/**
 * The search box text, safe inside a PostgREST `or` filter: commas, brackets, quotes and wildcards would change the
 * filter itself, so they become spaces. Anything that is not a string is no search.
 */
export const searchParam = z
  .string()
  .catch("")
  .transform((s) => s.replace(/[,()%*\\"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100));
