import { z } from "zod";

export const runScanInput = z.object({ businessId: z.uuid() });
