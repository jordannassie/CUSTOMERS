"use server";

import { refresh } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canEditTracking } from "@/modules/entitlements";
import { deleteQuestion, insertQuestion, updateQuestionActive, updateQuestionText, type ChangeResult } from "./dal";
import { addQuestionInput, editQuestionInput, removeQuestionInput, setQuestionActiveInput } from "./schema";

type Result = ActionResult<null>;

const invalidText: Result = { ok: false, status: 400, error: "Write a question between 8 and 200 characters." };
const invalid: Result = { ok: false, status: 400, error: "Something was missing. Refresh the page and try again." };

async function guard(): Promise<{ agencyId: string } | { denied: Result }> {
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

export async function editQuestion(input: unknown): Promise<Result> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const parsed = editQuestionInput.safeParse(input);
  if (!parsed.success) return invalidText;
  return done(await updateQuestionText(auth.agencyId, parsed.data.businessId, parsed.data.questionId, parsed.data.text));
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
