import { z } from "zod";
import { CHECKLIST_KEYS } from "./checklist";
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
