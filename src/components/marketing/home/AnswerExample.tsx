import { Check, Minus } from "lucide-react";
import { ExampleTag, MODEL_DOT, type ModelName } from "./example";

type Answer = { model: ModelName; named: string[]; mentioned: boolean };

const QUESTION = "Where can I get a good oat milk latte in Orange, CA?";
const YOU = "Bean House";

const ANSWERS: Answer[] = [
  { model: "ChatGPT", named: ["Daily Grind", "Bean House", "Brew Lab"], mentioned: true },
  { model: "Claude", named: ["Daily Grind", "Brew Lab"], mentioned: false },
  { model: "Perplexity", named: ["Bean House", "Daily Grind"], mentioned: true },
];

export function AnswerExample() {
  const count = ANSWERS.filter((a) => a.mentioned).length;

  return (
    <figure className="flex min-w-0 flex-col rounded-md border border-border bg-surface">
      <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-1">
          <figcaption className="text-[13px] text-text-hint">A customer asks AI</figcaption>
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
                <span className="inline-flex items-center gap-1 rounded-sm bg-good-bg px-2 py-0.5 text-xs font-semibold text-good-text">
                  <Check className="size-3" aria-hidden="true" />
                  Named you
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
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
                      ? "rounded-sm bg-primary-tint px-2 py-0.5 text-[13px] font-semibold text-primary-hover"
                      : "rounded-sm border border-border px-2 py-0.5 text-[13px] text-muted-foreground"
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
