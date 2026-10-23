"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, Plus, X } from "lucide-react";
import { cn } from "cn";
import type { ActionResult } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { FieldMessage, useFieldErrors } from "@/components/ui/field-errors";
import { Input } from "@/components/ui/input";
import { QuestionText } from "./QuestionText";
import { StepActions, StepError } from "./StepBits";

type Props = {
  businessId: string;
  questions: string[];
  limit: number;
  /** The suggestions were rebuilt for new business details (Back to the details step). */
  updated?: boolean;
  save: (input: { businessId: string; questions: string[] }) => Promise<ActionResult<{ count: number }>>;
};

const MIN_LENGTH = 8;

// MVP_SPEC 3.1 step 6: the questions each scan asks AI. Edit, remove or add, up to the plan's limit.
export function QuestionsStep({ businessId, questions, limit, updated = false, save }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(() => questions.map((text, id) => ({ id, text })));
  const nextId = useRef(questions.length);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const addId = useId();
  const fields = useFieldErrors<"add" | "rows">("questions");
  const short = (text: string) => text.trim() !== "" && text.trim().length < MIN_LENGTH;

  const kept = rows.filter((r) => r.text.trim());
  const full = rows.length >= limit;

  function add(e: React.FormEvent | React.MouseEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (full) return;
    // Say why nothing was added: a short or repeated question used to vanish without a word.
    if (text.length < MIN_LENGTH) return void fields.show({ add: `Each question needs at least ${MIN_LENGTH} characters.` });
    if (rows.some((r) => r.text.trim().toLowerCase() === text.toLowerCase())) {
      return void fields.show({ add: "You already have this question." });
    }
    const id = nextId.current++;
    setRows((list) => [...list, { id, text }]);
    setDraft("");
    fields.clear("add");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bad = fields.show({
      add: kept.length === 0 ? "Add at least one question a customer might ask." : undefined,
      rows: kept.some((r) => short(r.text)) ? `Each question needs at least ${MIN_LENGTH} characters.` : undefined,
    });
    if (bad) return;
    startTransition(async () => {
      const result = await save({ businessId, questions: kept.map((r) => r.text.trim()) });
      if (!result.ok) return setError(result.error);
      router.push("/onboarding/models");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {updated ? (
        <div role="status" data-testid="questions-updated" className="flex items-start gap-3 rounded-md border border-border bg-primary-tint px-4 py-3">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm">We updated your questions to match your new business details. Questions you wrote yourself are kept.</p>
        </div>
      ) : null}
      {/* The note belongs to the list, so it sits closer to it than the rest of the step (12px). */}
      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-border bg-surface">
          <div className="flex items-baseline justify-between gap-3 border-b border-border p-5">
            <h2 className="text-base font-semibold tracking-[-0.02em]">Questions we ask AI</h2>
            <span className="shrink-0 whitespace-nowrap text-[13px] tabular-nums text-muted-foreground">
              {kept.length} of {limit}
            </span>
          </div>
          {rows.length ? (
            <ol className="divide-y divide-border">
              {rows.map((r, i) => (
                <li key={r.id} className="flex items-start gap-2 px-2 py-1.5 sm:px-3">
                  <span aria-hidden className="mt-3 w-6 shrink-0 text-right text-xs tabular-nums text-text-hint">
                    {i + 1}
                  </span>
                  <QuestionText
                    value={r.text}
                    onChange={(text) => {
                      setRows((list) => list.map((x) => (x.id === r.id ? { ...x, text } : x)));
                      fields.clear("rows");
                    }}
                    maxLength={300}
                    aria-label={`Question ${i + 1}`}
                    {...(short(r.text) ? fields.fieldProps("rows") : {})}
                    className="border-transparent bg-transparent hover:border-border focus-visible:bg-surface"
                  />
                  <Button type="button" variant="ghost" size="icon-sm" className="mt-1.5 shrink-0" onClick={() => setRows((list) => list.filter((x) => x.id !== r.id))} aria-label={`Remove question ${i + 1}`}>
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">No questions left. Add the questions your customers would ask AI.</p>
          )}
          <div className={cn("flex flex-col gap-2 border-t border-border bg-muted px-4 py-3 sm:flex-row", full && "opacity-80")}>
            <label htmlFor={addId} className="sr-only">
              Add a question
            </label>
            <Input
              id={addId}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                fields.clear("add");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") add(e);
              }}
              maxLength={300}
              disabled={full}
              placeholder={full ? `Your plan checks up to ${limit} questions.` : "Add a question a customer might ask"}
              className="h-10"
              {...fields.fieldProps("add")}
            />
            <Button type="button" variant="outline" onClick={add} disabled={full || draft.trim().length < MIN_LENGTH} className="shrink-0">
              <Plus aria-hidden />
              Add
            </Button>
          </div>
          {(fields.errors.rows || fields.errors.add) && (
            <div className="border-t border-border px-4 py-2">
              <FieldMessage id={fields.idOf("rows")} message={fields.errors.rows} />
              <FieldMessage id={fields.idOf("add")} message={fields.errors.add} />
            </div>
          )}
        </div>
        {/* Questions the user writes could raise the score at will, so only suggested ones count (BUG-129). */}
        <p className="text-[13px] text-muted-foreground" data-testid="own-questions-note">
          Your score counts the suggested questions. Questions you add or reword are checked too, but they don&apos;t count in
          your score.
        </p>
      </div>

      <StepError message={error} />
      <StepActions backHref="/onboarding/competitors" pending={pending} />
    </form>
  );
}
