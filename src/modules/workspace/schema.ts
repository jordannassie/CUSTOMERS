import { z } from "zod";

export const switchBusinessInput = z.object({ businessId: z.uuid() });

export type SwitchBusinessInput = z.infer<typeof switchBusinessInput>;
