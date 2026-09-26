import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/require";
import { Badge } from "@/components/ui/badge";
import { Buttons, Badges, Fields } from "./_components/controls";
import { DataDisplay } from "./_components/data-display";
import { Overlays } from "./_components/overlays";
import { Palette } from "./_components/palette";
import { Section } from "./_components/section";
import { States } from "./_components/states";
import { Typography } from "./_components/typography";

export const metadata: Metadata = {
  title: "Design preview",
  robots: { index: false, follow: false },
};

const NAV = [
  ["colours", "Colours"],
  ["type", "Type"],
  ["buttons", "Buttons"],
  ["fields", "Fields"],
  ["badges", "Badges"],
  ["data", "Cards and data"],
  ["overlays", "Menus and dialogs"],
  ["states", "States"],
] as const;

export default async function DesignPreviewPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-6 px-4 sm:px-6">
          <p className="shrink-0 font-bold tracking-[-0.02em]">
            Customers<span className="text-primary">.</span>Direct
          </p>
          <nav aria-label="Sections" className="-mx-2 flex min-w-0 gap-1 overflow-x-auto">
            {NAV.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="shrink-0 rounded-md px-2 py-1 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 pb-24 sm:px-6">
        <div className="py-12">
          <Badge variant="tint">Team only</Badge>
          <h1 className="mt-4 text-[32px] leading-tight font-bold tracking-[-0.02em] sm:text-5xl sm:tracking-[-0.035em]">
            Design preview
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Every building block in its final look. The rules behind it are in docs/design/DESIGN.md.
          </p>
        </div>

        <Section id="colours" title="Colours" description="One blue for you and for actions. Status colours fill rings and bars; status text uses the darker text shade.">
          <Palette />
        </Section>
        <Section id="type" title="Type" description="Geist for everything. Tabular numbers for scores, credits and money.">
          <Typography />
        </Section>
        <Section id="buttons" title="Buttons" description="4px corners. The blue button is the main action on a screen.">
          <Buttons />
        </Section>
        <Section id="fields" title="Fields" description="Labels above inputs, help text below, errors say how to fix the problem. Submit the form empty to see the error.">
          <Fields />
        </Section>
        <Section id="badges" title="Badges" description="3px corners. Used for status and labels, never as buttons.">
          <Badges />
        </Section>
        <Section id="data" title="Cards and data" description="Cards have a border and no shadow. In charts the business is blue and competitors are greys.">
          <DataDisplay />
        </Section>
        <Section id="overlays" title="Menus and dialogs" description="Floating layers are the only place with a shadow.">
          <Overlays />
        </Section>
        <Section id="states" title="States" description="Every screen designs its loading, empty and error states.">
          <States />
        </Section>
      </main>
    </div>
  );
}
