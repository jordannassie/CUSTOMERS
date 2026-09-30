import { z } from "zod";

export const checkoutProductSchema = z.enum(["launch_kit", "agency_program"]);

export const markLessonCompleteSchema = z.object({
  lessonId: z.string().min(1).max(80),
});

export const claimSessionSchema = z.object({
  sessionId: z.string().min(1).max(200),
});

export const createAccountAfterPurchaseSchema = z.object({
  sessionId: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
});
