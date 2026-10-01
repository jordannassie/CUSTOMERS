import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section, Eyebrow, H2, Lead } from "../section";
import { OverviewExample } from "./OverviewExample";
import { CompetitorsExample } from "./CompetitorsExample";
import { FixStepsExample } from "./FixStepsExample";

const TABS = [
  {
    value: "visibility",
    label: "Visibility",
    title: "One score from real AI answers",
    body: [
      "Your visibility score is how often AI named you across all checks in the last 30 days, shown for each AI and overall.",
      "A confidence label tells you how solid the number is, and the trend line shows the last 7 days.",
    ],
    visual: <OverviewExample />,
  },
  {
    value: "competitors",
    label: "Competitors",
    title: "See who AI names instead of you",
    body: [
      "Compare your score with the competitors you track, plus any business AI keeps naming that you did not list.",
      "We only say ahead or behind when the gap is bigger than the margin of error.",
    ],
    visual: <CompetitorsExample />,
  },
  {
    value: "fix-steps",
    label: "Fix steps",
    title: "Know what to fix first",
    body: [
      "After each scan we explain, in plain words, why competitors show up more, using facts from the scan and their Google listings.",
      "Each reason becomes a fix step with its impact, the evidence and what to do.",
    ],
    visual: <FixStepsExample />,
  },
] as const;

export function ProductTabs() {
  return (
    <Section id="product">
      <div className="flex flex-col gap-4">
        <Eyebrow>Product</Eyebrow>
        <H2 className="max-w-[22ch]">What you see after each scan</H2>
        <Lead>These screens use a made-up coffee shop so you can see what a report looks like.</Lead>
      </div>

      <Tabs defaultValue="visibility" className="mt-10 gap-10">
        <TabsList variant="line" className="h-auto w-full justify-start gap-0 border-b border-border p-0">
          {TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="h-11 flex-none px-4 text-[15px] first:pl-0">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(({ value, title, body, visual }) => (
          <TabsContent key={value} value={value} className="flex flex-col gap-8">
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16">
              <h3 className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance">{title}</h3>
              <div className="flex flex-col gap-3 text-[15px] text-muted-foreground">
                {body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
            {visual}
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  );
}
