import { z } from "zod";

// Input for startPlanNow. The page makes a new attemptId for each try (see endTrialNow).
export const startPlanNowInput = z.object({ attemptId: z.uuid() });
