"use server";

import { refresh } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { deleteQuestion, insertQuestion, updateQuestionActive, updateQuestionText, type ChangeResult } from "./dal";
import { addQuestionInput, editQuestionInput, removeQuestionInput, setQuestionActiveInput } from "./schema";

type Result = ActionResult<null>;

const invalidText: Result = { ok: false, status: 400, error: "Write a question between 8 and 200 characters." };
const invalid: Result = { ok: false, status: 400, error: "Something was missing. Refresh the page and try again." };

async function guard(): Promise<Result | null> {
  try {
    await requireAgency();
    return null;
  } catch (error) {
    return authFailure(error);
  }
}

function done(result: ChangeResult): Result {
  if (!result.ok) return result;
  refresh();
  return { ok: true, data: null };
}

export async function addQuestion(input: unknown): Promise<Result> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = addQuestionInput.safeParse(input);
  if (!parsed.success) return invalidText;
  return done(await insertQuestion(parsed.data.businessId, parsed.data.text));
}

export async function editQuestion(input: unknown): Promise<Result> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = editQuestionInput.safeParse(input);
  if (!parsed.success) return invalidText;
  return done(await updateQuestionText(parsed.data.businessId, parsed.data.questionId, parsed.data.text));
}

export async function setQuestionActive(input: unknown): Promise<Result> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = setQuestionActiveInput.safeParse(input);
  if (!parsed.success) return invalid;
  return done(await updateQuestionActive(parsed.data.businessId, parsed.data.questionId, parsed.data.active));
}

export async function removeQuestion(input: unknown): Promise<Result> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = removeQuestionInput.safeParse(input);
  if (!parsed.success) return invalid;
  return done(await deleteQuestion(parsed.data.businessId, parsed.data.questionId));
}
