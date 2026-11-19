import { z } from "zod";
import { bankOutcome } from "../plan-change/schema";

// Input for startPlanNow. The page makes a new attemptId for each try (see endTrialNow). `bankStep` is the bank's
// answer for a payment that needed its confirmation (3D Secure, plan-change/payment.ts).
export const startPlanNowInput = z.object({ attemptId: z.uuid(), bankStep: bankOutcome.optional() });
