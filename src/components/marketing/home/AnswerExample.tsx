import { Check, Minus } from "lucide-react";
import { ExampleTag, MODEL_DOT, type ModelName } from "./example";

export type Answer = { model: ModelName; named: string[]; mentioned: boolean };

// The made-up example the "AI answers" tab and the hero thread share (MVP_SPEC 12.2).
export const QUESTION = "Where can I get a good oat milk latte in Orange, CA?";
export const YOU = "Bean House";

export const ANSWERS: Answer[] = [
  { model: "ChatGPT", named: ["Daily Grind", "Bean House", "Brew Lab"], mentioned: true },
  { model: "Claude", named: ["Daily Grind", "Brew Lab"], mentioned: false },
  { model: "Perplexity", named: ["Bean House", "Daily Grind"], mentioned: true },
];

export function AnswerExample() {
  const count = ANSWERS.filter((a) => a.mentioned).length;

  return (
    <figure className="flex min-w-0 flex-col rounded-xl bg-surface">
      <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-1">
          <figcaption className="text-[13px] text-muted-foreground">A customer asks AI</figcaption>
          <p className="text-[15px] font-semibold text-pretty">&ldquo;{QUESTION}&rdquo;</p>
        </div>
        <ExampleTag />
      </div>

      <ul className="flex flex-col">
        {ANSWERS.map(({ model, named, mentioned }) => (
          <li key={model} className="flex flex-col gap-2 border-b border-border px-4 py-3.5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={`size-2 rounded-full ${MODEL_DOT[model]}`} aria-hidden="true" />
                {model}
              </span>
              {mentioned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-good-bg px-2 py-0.5 text-xs font-semibold text-good-text">
                  <Check className="size-3" aria-hidden="true" />
                  Named you
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  <Minus className="size-3" aria-hidden="true" />
                  Not named
                </span>
              )}
            </div>
            <ol className="flex flex-wrap gap-1.5" aria-label={`Businesses ${model} named`}>
              {named.map((name) => (
                <li
                  key={name}
                  className={
                    name === YOU
                      ? "rounded-full bg-brand-tint-2 px-2.5 py-0.5 text-[13px] font-semibold text-brand-ink"
                      : "rounded-full bg-rival-mark px-2.5 py-0.5 text-[13px] text-foreground"
                  }
                >
                  {name}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>

      <p className="p-4 text-sm sm:p-5">
        <span className="font-semibold text-primary">{YOU}</span> was named in{" "}
        <span className="tabular font-semibold">
          {count} of {ANSWERS.length}
        </span>{" "}
        answers. Daily Grind was named in all {ANSWERS.length}.
      </p>
    </figure>
  );
}
