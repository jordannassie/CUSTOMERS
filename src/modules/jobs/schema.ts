import { z } from "zod";

export const businessIdInput = z.object({ businessId: z.uuid() });
