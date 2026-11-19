import { z } from "zod";
import type { PeriodDays } from "./service";

// ?days= is "month", 7, 30 or 90; anything else falls back to 30 days.
export const periodFilter = z
  .enum(["month", "7", "30", "90"])
  .catch("30")
  .transform((d): PeriodDays => (d === "month" ? "month" : (Number(d) as PeriodDays)));

export const includeTestFilter = z
  .string()
  .optional()
  .catch(undefined)
  .transform((v) => v === "1");
