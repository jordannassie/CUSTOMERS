import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Section, H2, Lead } from "../section";
import { MODEL_DOT, type ModelName } from "./example";
import { MR_DIRECT_STOREFRONT } from "./media";

// Local questions only, on the three AI tools we check (D-34: no Gemini or Google AI claims).
const QUESTIONS: { text: string; model: ModelName }[] = [
  { text: "Who is the best HVAC company near me?", model: "ChatGPT" },
  { text: "Which dentist in Irvine takes new patients?", model: "Claude" },
  { text: "Where can I get a good haircut in Orange this weekend?", model: "Perplexity" },
  { text: "Which roofer in Tustin has the best reviews?", model: "ChatGPT" },
  { text: "Who does emergency plumbing in Long Beach?", model: "Claude" },
  { text: "Best coffee shop to work from in Orange, CA?", model: "Perplexity" },
  { text: "Which auto shop near me is honest about prices?", model: "ChatGPT" },
  { text: "Best yoga studio for beginners in Costa Mesa?", model: "Claude" },
];

function QuestionChips({ copy }: { copy?: boolean }) {
  return (
    <ul
      aria-hidden={copy || undefined}
      className={cn("flex shrink-0 gap-3 pr-3 motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:pr-0", copy && "motion-reduce:hidden")}
    >
      {QUESTIONS.map(({ text, model }) => (
        <li key={text} className="flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2 text-[13px]">
          <span className={cn("size-2 rounded-full", MODEL_DOT[model])} aria-hidden="true" />
          <span className="font-medium whitespace-nowrap motion-reduce:whitespace-normal">{text}</span>
          <span className="text-text-hint">{model}</span>
        </li>
      ))}
    </ul>
  );
}

/** Mr. Direct outside the Customers.Direct building, then a scrolling row of the kind of questions we ask AI for you. */
export function MrDirectPrompts() {
  return (
    <Section aria-labelledby="questions-heading">
      <div className="relative overflow-hidden rounded-xl bg-surface">
        <div className="relative aspect-[1672/941]">
          <Image
            src={MR_DIRECT_STOREFRONT}
            alt="Mr. Direct outside the Customers.Direct building with AI assistant icons in front of him"
            fill
            sizes="(min-width: 1120px) 1072px, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex justify-center p-4 sm:absolute sm:inset-x-0 sm:bottom-6 sm:p-0">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/signup">
              See where you show up
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-14 flex flex-col items-center gap-4 text-center">
        <H2 id="questions-heading" className="max-w-[22ch]">
          Your customers ask AI before they call
        </H2>
        <Lead>
          We ask ChatGPT, Claude and Perplexity questions like these for you, set to your city, and record who gets named.
        </Lead>
      </div>

      <div className="mt-10 -mx-4 overflow-hidden px-4 sm:-mx-6 sm:px-6">
        <div className="marquee-scroll flex w-max motion-reduce:w-full">
          <QuestionChips />
          <QuestionChips copy />
        </div>
      </div>
    </Section>
  );
}
