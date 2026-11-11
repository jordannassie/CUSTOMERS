import Image from "next/image";
import { Section, H2, Lead } from "../section";
import { STEP_PICTURES } from "./media";

const STEPS = [
  {
    title: "Measure",
    body: "We ask ChatGPT, Claude and Perplexity the questions your customers ask, set to your city, and record whether each answer names you.",
  },
  {
    title: "Compare",
    body: "See which competitors AI names instead of you, how often, and the sites it leans on for its answers.",
  },
  {
    title: "Fix",
    body: "Get plain steps based on what the scan found, such as reviews, listings and website info. Website fixes come with a prompt you can copy into Claude.",
  },
  {
    title: "Track",
    body: "Scans repeat on your schedule. Your visibility score covers the last 30 days, so you see real change, not one lucky answer.",
  },
] as const;

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="surface">
      <div className="flex flex-col gap-4">
        <H2 className="max-w-[20ch]">Four steps, repeated every scan</H2>
        <Lead>Setup takes a few minutes. After that, each scan runs by itself and tells you what changed.</Lead>
      </div>

      <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {STEPS.map(({ title, body }, i) => (
          <li key={title} className="flex flex-col overflow-hidden rounded-xl bg-surface">
            <div className="relative aspect-square bg-muted">
              <Image src={STEP_PICTURES[title].src} alt={STEP_PICTURES[title].alt} fill sizes="(min-width: 1024px) 260px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-col gap-3 px-6 py-[22px]">
              <span className="tabular text-[13px] font-medium text-muted-foreground">Step {i + 1}</span>
              <h3 className="font-display font-semibold text-xl">{title}</h3>
              <p className="text-[15px] text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
