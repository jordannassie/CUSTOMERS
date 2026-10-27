import { z } from "zod";
import { CHECKLIST_KEYS } from "./checklist";
import { ACTION_STATUSES } from "./board/service";
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
  source: z.enum(["comparison", "sources", "manual"]),
  dedupeKey: text(300),
  evidenceData: z.record(z.string().max(40), z.union([z.string().max(300), z.number(), z.boolean(), z.null(), z.array(z.string().max(120)).max(20)])).optional(),
});

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
