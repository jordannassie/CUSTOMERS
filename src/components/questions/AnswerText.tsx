import { ExternalLink } from "lucide-react";
import { cn } from "cn";
import { answerBlocks, markNames, type Part } from "@/modules/questions/answer-format";
import { inlineParts } from "@/modules/questions/answer-parse";

type Names = { you: string | null; others: string[] };

/** A cited web address as a small chip with its site name, never the long address itself. */
export function SourceChip({ host, url }: { host: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={host}
      className="mx-0.5 inline-flex max-w-[180px] items-center gap-1 rounded-xs bg-muted px-1.5 align-baseline text-xs text-muted-foreground hover:text-primary"
      data-testid="source-chip"
    >
      <span className="truncate">{host}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function Marked({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.mark === "you" ? (
          <mark key={i} className="rounded-xs bg-primary-tint px-0.5 font-semibold text-primary">
            {p.text}
          </mark>
        ) : p.mark === "other" ? (
          <strong key={i} className="font-semibold">
            {p.text}
          </strong>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** One line of an answer: business names marked, web addresses as chips. */
export function InlineText({ text, names }: { text: string; names: Names }) {
  return (
    <>
      {inlineParts(text).map((p, i) =>
        p.kind === "source" ? <SourceChip key={i} host={p.host} url={p.url} /> : <Marked key={i} parts={markNames(p.text, names.you, names.others)} />,
      )}
    </>
  );
}

function ListTag({ ordered, children }: { ordered: boolean; children: React.ReactNode }) {
  const className = cn("flex flex-col gap-1.5 pl-5 marker:text-text-hint", ordered ? "list-decimal" : "list-disc");
  return ordered ? <ol className={className}>{children}</ol> : <ul className={className}>{children}</ul>;
}

/** The whole answer in its own words: paragraphs and lists, names marked, addresses as chips. */
export function AnswerText({ text, names }: { text: string; names: Names }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed wrap-break-word" data-testid="answer-text">
      {answerBlocks(text).map((b, i) =>
        b.kind === "p" ? (
          <p key={i}>
            <InlineText text={b.text} names={names} />
          </p>
        ) : (
          <ListTag key={i} ordered={b.ordered}>
            {b.items.map((item, j) => (
              <li key={j}>
                <InlineText text={item} names={names} />
              </li>
            ))}
          </ListTag>
        ),
      )}
    </div>
  );
}
