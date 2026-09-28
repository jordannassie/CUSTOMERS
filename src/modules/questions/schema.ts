import { z } from "zod";

// Same cap as the library templates (onboarding/question-rules.ts isUsableTemplate).
export const QUESTION_MAX_LENGTH = 200;
export const QUESTION_MIN_LENGTH = 8;

const text = z.string().trim().min(QUESTION_MIN_LENGTH).max(QUESTION_MAX_LENGTH);
const ids = { businessId: z.uuid(), questionId: z.uuid() };

export const addQuestionInput = z.object({ businessId: z.uuid(), text });
export const editQuestionInput = z.object({ ...ids, text });
export const setQuestionActiveInput = z.object({ ...ids, active: z.boolean() });
export const removeQuestionInput = z.object(ids);
