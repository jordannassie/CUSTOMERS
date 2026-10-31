import { z } from "zod";
import { CHECKLIST_KEYS } from "./checklist";
import { ACTION_STATUSES, ADDED_SOURCES } from "./board/service";
import { STATUSES } from "./service";

export const setStatusInput = z.object({
  businessId: z.uuid(),
  opportunityId: z.uuid(),
  status: z.enum(STATUSES),
});

export const setChecklistInput = z.object({
  businessId: z.uuid(),
  key: z.enum(CHECKLIST_KEYS),
  done: z.boolean(),
});

const text = (max: number) => z.string().trim().min(1).max(max);

export const MAX_EVIDENCE_KEYS = 10;
export const MAX_EVIDENCE_CHARS = 2000;

/** "Add to Actions" on Compare or Sources, and "Add action" on the board. */
export const addActionInput = z.object({
  businessId: z.uuid(),
  title: text(160),
  fact: text(600),
  whatToDo: text(1200),
  whereToApply: text(200),
  impact: z.enum(["high", "medium", "low"]),
  category: z.enum([
    "content",
    "service_page",
    "technical",
    "structured_data",
    "entity_consistency",
    "citations",
    "reviews_reputation",
    "local_presence",
    "competitor_gap",
    "agent_readiness",
  ]),
  source: z.enum(ADDED_SOURCES),
  dedupeKey: text(300),
  evidenceData: z
    .record(z.string().max(40), z.union([z.string().max(300), z.number(), z.boolean(), z.null(), z.array(z.string().max(120)).max(20)]))
    // A few small facts (answer count, domain, competitor id): never a large blob in the row.
    .refine((d) => Object.keys(d).length <= MAX_EVIDENCE_KEYS && JSON.stringify(d).length <= MAX_EVIDENCE_CHARS)
    .optional(),
});

/**
 * Open fixes a business may have from "Add action", Compare and Sources; scan fixes do not count. Far more than anyone
 * works through, so it only stops a script filling the board.
 */
export const MAX_OPEN_ADDED_ACTIONS = 200;
export const ADDED_ACTIONS_FULL = `You have ${MAX_OPEN_ADDED_ACTIONS} open actions you added. Mark some done or dismiss them, then add more.`;

export const moveActionInput = z.object({
  businessId: z.uuid(),
  actionId: z.uuid(),
  status: z.enum(ACTION_STATUSES),
});

export const assignActionInput = z.object({
  businessId: z.uuid(),
  actionId: z.uuid(),
  toMe: z.boolean(),
});
