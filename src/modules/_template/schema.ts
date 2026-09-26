import { z } from "zod";

export const renameBusinessInput = z.object({
  businessId: z.uuid(),
  name: z.string().max(200),
});

export type RenameBusinessInput = z.infer<typeof renameBusinessInput>;
