import { z } from "zod";
import type { PeriodDays } from "./service";

// Anything but 7, 30 or 90 in ?days= falls back to 30 days.
export const periodFilter = z
  .enum(["7", "30", "90"])
  .catch("30")
  .transform((d) => Number(d) as PeriodDays);

export const includeTestFilter = z
  .string()
  .optional()
  .catch(undefined)
  .transform((v) => v === "1");
