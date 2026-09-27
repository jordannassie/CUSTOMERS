import { ChevronDown } from "lucide-react";
import { Section, Eyebrow, H2 } from "../section";

const FAQS = [
  {
    q: "Can you guarantee AI will recommend my business?",
    a: "No, and be wary of anyone who says they can. OpenAI, Anthropic and Perplexity control their AI, not us. We measure how often you are named, show the evidence, and help you improve the things you do control: your reviews, listings, website and business info.",
  },
  {
    q: "Which AI assistants do you check?",
    a: "ChatGPT, Claude and Perplexity. Each check uses web search and your business location, so answers match what someone nearby would get.",
  },
  {
    q: "Do you use the real ChatGPT and Claude apps?",
    a: "We use each company's official service for developers, the reliable way to ask many questions. Answers can differ a little from the chat apps, so we compare the two by hand from time to time and explain our method next to every score.",
  },
  {
    q: "How is the visibility score worked out?",
    a: "It is the share of checks in the last 30 days where AI named your business, from 0 to 100. We do not rank you by position in a list, because AI changes the order from one answer to the next.",
  },
  {
    q: "How is this different from SEO tools?",
    a: "SEO tools track where you rank on Google. We ask AI the questions your customers ask and report what it actually says: whether you are named, which competitors are named instead, and which sites it relies on.",
  },
  {
    q: "What happens after I sign up?",
    a: "Give us your website or Google listing. We fill in your business details, suggest competitors and customer questions, and you check and edit them. Then your first scan runs and your report is ready in minutes.",
  },
  {
    q: "How does the free trial work?",
    a: "The trial lasts 7 days and covers up to 2 businesses. A card is needed to start. The plan you chose is charged on day 7 unless you cancel before then.",
  },
  {
    q: "Is this right for agencies?",
    a: "Yes. One login holds all your client businesses, each with its own questions, competitors and reports. Credits from every business go into one shared pool.",
  },
] as const;

export function FaqList({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="border-t border-border">
      {items.map(({ q, a }) => (
        <details key={q} className="group border-b border-border">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-sm py-5 text-left text-[15px] font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            {q}
            <ChevronDown
              className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <p className="max-w-[65ch] pb-5 text-[15px] text-muted-foreground">{a}</p>
        </details>
      ))}
    </div>
  );
}

export function Faq() {
  return (
    <Section id="faq">
      <div className="grid gap-10 md:grid-cols-[1fr_2fr] md:gap-16">
        <div className="flex flex-col gap-4">
          <Eyebrow>FAQ</Eyebrow>
          <H2>Straight answers</H2>
        </div>
        <FaqList items={FAQS} />
      </div>
    </Section>
  );
}
