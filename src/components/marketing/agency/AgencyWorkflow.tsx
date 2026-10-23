import { Section, H2, Lead } from "../section";

const STEPS = [
  {
    title: "Add a client",
    body: "Enter their website or Google listing. We fill in the business details and suggest competitors and customer questions for you to check.",
  },
  {
    title: "See where they stand",
    body: "We ask ChatGPT, Claude and Perplexity those questions from the client's city and record who gets named, and which sites the answers rely on.",
  },
  {
    title: "Work through the fixes",
    body: "Each scan gives plain steps, such as reviews, listings and website info. Website fixes come with a prompt your team can copy into Claude.",
  },
  {
    title: "Report the progress",
    body: "Send a PDF report with your logo, or a read-only link the client can open anytime. Scans repeat on the schedule you set.",
  },
] as const;

export function AgencyWorkflow() {
  return (
    <Section id="how-it-works" tone="surface">
      <div className="flex flex-col gap-4">
        <H2 className="max-w-[22ch]">The same routine for every client</H2>
        <Lead>Set up a client in a few minutes, then each scan tells you what changed and what to work on next.</Lead>
      </div>

      <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {STEPS.map(({ title, body }, i) => (
          <li key={title} className="flex flex-col gap-3 border-t-2 border-border pt-5 first:border-primary">
            <span className="tabular text-[13px] font-medium text-text-hint">Step {i + 1}</span>
            <h3 className="text-xl font-semibold tracking-[-0.02em]">{title}</h3>
            <p className="text-[15px] text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-10 max-w-[65ch] text-[13px] text-text-hint">
        We tell you what to fix and how. We do not change client websites for you.
      </p>
    </Section>
  );
}
