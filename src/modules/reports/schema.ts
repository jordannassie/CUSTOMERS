import { z } from "zod";

export const createShareLinkInput = z.object({ businessId: z.uuid() });

export const revokeShareLinkInput = z.object({ id: z.uuid() });

export const exportPdfInput = z.object({ businessId: z.uuid() });
