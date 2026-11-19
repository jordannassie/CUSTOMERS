import { z } from "zod";

// Same cap as the library templates (onboarding/question-rules.ts isUsableTemplate).
export const QUESTION_MAX_LENGTH = 200;
export const QUESTION_MIN_LENGTH = 8;
/** A topic is a short tag the user picks, like "Delivery" (stored in tracked_prompts.category). */
export const TOPIC_MAX_LENGTH = 24;

const text = z.string().trim().min(QUESTION_MIN_LENGTH).max(QUESTION_MAX_LENGTH);
const ids = { businessId: z.uuid(), questionId: z.uuid() };

/** Single spaces, trimmed; an empty topic clears it (null). */
export const topicField = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(z.string().max(TOPIC_MAX_LENGTH))
  .transform((s) => s || null);

export const addQuestionInput = z.object({ businessId: z.uuid(), text });
/** `topic` left out keeps the saved one. */
export const editQuestionInput = z.object({ ...ids, text, topic: topicField.optional() });
export const setQuestionActiveInput = z.object({ ...ids, active: z.boolean() });
export const removeQuestionInput = z.object(ids);
export const questionAnswersInput = z.object(ids);

const DOMAIN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** "https://www.Yelp.com/biz" or "yelp.com" to "yelp.com"; anything else is dropped. */
const domain = z
  .string()
  .transform((s) => s.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0])
  .pipe(z.string().regex(DOMAIN));

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);

/**
 * The page's own links (questionsHref): ?q=<question id> opens one question, ?site=<domain> shows the questions whose
 * answers used that site, ?named=<business> the ones where AI named that business and not you. A bad value is ignored.
 */
export const questionsPageParams = z.object({
  q: z.preprocess(one, z.uuid().optional()).catch(undefined),
  site: z.preprocess(one, domain.optional()).catch(undefined),
  named: z.preprocess(one, z.string().trim().min(2).max(200).optional()).catch(undefined),
  ai: z.preprocess(one, z.enum(["openai", "anthropic", "perplexity"]).optional()).catch(undefined),
});

export type QuestionsPageParams = z.infer<typeof questionsPageParams>;
