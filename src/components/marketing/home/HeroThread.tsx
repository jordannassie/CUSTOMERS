import { Check, Minus } from "lucide-react";
import { cn } from "cn";
import { ANSWERS, QUESTION, YOU } from "./AnswerExample";
import { ExampleTag, MODEL_DOT, type ModelName } from "./example";

// The same letters as the app's G, C and P tool badges.
const AVATAR: Record<ModelName, string> = { ChatGPT: "G", Claude: "C", Perplexity: "P" };

const CORNER = ["rounded-[6px_20px_20px_20px]", "rounded-[20px]", "rounded-[20px]"];

/** A business name in an answer: brand tint for "you", the rival mark for everyone else. */
function Named({ name }: { name: string }) {
  return (
    <mark className={cn("rounded-[4px] px-1 text-foreground", name === YOU ? "bg-brand-tint-2 font-semibold text-brand-ink" : "bg-rival-mark")}>{name}</mark>
  );
}

function NameList({ names }: { names: string[] }) {
  return (
    <>
      {names.map((n, i) => (
        <span key={n}>
          {i > 0 && (i === names.length - 1 ? " and " : ", ")}
          <Named name={n} />
        </span>
      ))}
    </>
  );
}

// Check-in hero (C-Overview): the made-up coffee shop's example as a short thread. A customer's question on the right,
// then each AI's answer as a card with the names it gave, then the tally. Same example data as the "AI answers" tab.
export function HeroThread() {
  const count = ANSWERS.filter((a) => a.mentioned).length;
  return (
    <figure className="flex min-w-0 flex-col gap-3.5" aria-label={`Example: three AI answers to "${QUESTION}"`}>
      <div className="flex items-center justify-between gap-3">
        <figcaption className="text-[13px] text-muted-foreground">A customer asks AI</figcaption>
        <ExampleTag />
      </div>
      <p className="animate-rise rounded-[16px] border border-border-strong bg-surface px-4 py-3 text-[15px] font-medium text-foreground [animation-delay:0.1s]">
        {QUESTION}
      </p>
      <ol className="flex flex-col gap-3">
        {ANSWERS.map(({ model, named, mentioned }, i) => (
          <li key={model} className="flex animate-rise items-start gap-3" style={{ animationDelay: `${0.4 + i * 0.35}s` }}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-ai font-display font-semibold text-white" aria-hidden="true">
              {AVATAR[model]}
            </span>
            <div className={cn("flex min-w-0 flex-1 flex-col gap-2 bg-surface px-5 py-4", CORNER[i])}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2 rounded-full", MODEL_DOT[model])} aria-hidden="true" />
                  {model}
                </span>
                {mentioned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint-2 px-2.5 py-0.5 text-xs font-semibold text-brand-strong">
                    <Check className="size-3" aria-hidden="true" />
                    Named you
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-track px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    <Minus className="size-3" aria-hidden="true" />
                    Not named
                  </span>
                )}
              </div>
              <p className="font-display font-semibold text-[17px] leading-relaxed">
                <NameList names={named} />
              </p>
            </div>
          </li>
        ))}
        <li className="flex animate-rise items-start gap-3 [animation-delay:1.5s]">
          <span className="w-9 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 rounded-[20px_20px_20px_6px] bg-surface px-5 py-4 text-sm leading-relaxed">
            <span className="font-semibold text-brand">{YOU}</span> was named in{" "}
            <span className="tabular font-semibold">
              {count} of {ANSWERS.length}
            </span>{" "}
            answers. Daily Grind was named in all {ANSWERS.length}.
          </p>
        </li>
      </ol>
    </figure>
  );
}
