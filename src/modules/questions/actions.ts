"use server";

import { refresh } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canEditTracking } from "@/modules/entitlements";
import type { QuestionAnswer } from "./answers";
import { deleteQuestion, insertQuestion, loadQuestionAnswers, updateQuestionActive, updateQuestionText, type ChangeResult } from "./dal";
import {
  addQuestionInput,
  editQuestionInput,
  questionAnswersInput,
  removeQuestionInput,
  setQuestionActiveInput,
  TOPIC_MAX_LENGTH,
} from "./schema";

type Result = ActionResult<null>;
// Failures fit every action's result type.
type Failure = ActionResult<never>;

const invalidText: Failure = { ok: false, status: 400, error: "Write a question between 8 and 200 characters." };
const invalidTopic: Failure = { ok: false, status: 400, error: `Keep the topic to ${TOPIC_MAX_LENGTH} characters or fewer.` };
const invalid: Failure = { ok: false, status: 400, error: "Something was missing. Refresh the page and try again." };

async function guard(): Promise<{ agencyId: string } | { denied: Failure }> {
  try {
    const { agency } = await requireAgency();
    const edit = canEditTracking(agency);
    if (!edit.allowed) return { denied: { ok: false, status: 403, error: edit.reason } };
    return { agencyId: agency.id };
  } catch (error) {
    return { denied: authFailure(error) };
  }
}

function done(result: ChangeResult): Result {
  if (!result.ok) return result;
  refresh();
  return { ok: true, data: null };
}

export async function addQuestion(input: unknown): Promise<Result> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const parsed = addQuestionInput.safeParse(input);
  if (!parsed.success) return invalidText;
  return done(await insertQuestion(auth.agencyId, parsed.data.businessId, parsed.data.text));
}

/** `newQuestion`: the edit was saved as a new question and the old one paused with its results (M2). */
export async function editQuestion(input: unknown): Promise<ActionResult<{ newQuestion: boolean }>> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const parsed = editQuestionInput.safeParse(input);
  if (!parsed.success) return parsed.error.issues.some((i) => i.path[0] === "topic") ? invalidTopic : invalidText;
  const { businessId, questionId, text, topic } = parsed.data;
  const result = await updateQuestionText(auth.agencyId, businessId, questionId, text, topic);
  if (!result.ok) return result;
  refresh();
  return { ok: true, data: { newQuestion: result.newQuestion } };
}

export async function setQuestionActive(input: unknown): Promise<Result> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const parsed = setQuestionActiveInput.safeParse(input);
  if (!parsed.success) return invalid;
  return done(await updateQuestionActive(auth.agencyId, parsed.data.businessId, parsed.data.questionId, parsed.data.active));
}

export async function removeQuestion(input: unknown): Promise<Result> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const parsed = removeQuestionInput.safeParse(input);
  if (!parsed.success) return invalid;
  return done(await deleteQuestion(auth.agencyId, parsed.data.businessId, parsed.data.questionId));
}

/** What each AI last answered to one question (BUG-089). Read only, so a paused or ended plan can still look. */
export async function getQuestionAnswers(input: unknown): Promise<ActionResult<{ answers: QuestionAnswer[] }>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = questionAnswersInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Something was missing. Refresh the page and try again." };
  const answers = await loadQuestionAnswers(agencyId, parsed.data.businessId, parsed.data.questionId);
  if (!answers) return { ok: false, status: 404, error: "We could not find that question. Refresh the page and try again." };
  return { ok: true, data: { answers } };
}
