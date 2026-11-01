import { CheckWebsite, type CheckWebsiteAction } from "../CheckWebsite";
import type { SaveWebsiteAction } from "../CompetitorWebsite";
import { WebsiteCompare } from "../WebsiteCompare";
import type { WhyPanel } from "@/modules/competitors";
import { WebsiteSays } from "./WebsiteSays";
import { WebsiteScore } from "./WebsiteScore";

/**
 * "Websites" (B-91): the one place to check a competitor's website (read once, D-85), then what it says against yours:
 * services with their words, claims questions ask about, and the checks AI tools use.
 */
export function WebsitesTab({
  panel,
  businessId,
  actions,
}: {
  panel: WhyPanel;
  businessId: string;
  actions: { check: CheckWebsiteAction; save: SaveWebsiteAction };
}) {
  const { website, why } = panel;
  return (
    <div className="flex flex-col gap-8" data-testid="tab-websites">
      <CheckWebsite businessId={businessId} competitorId={panel.competitorId} name={why.name} website={website} check={actions.check} save={actions.save} />
      {website.checked && website.status === "read" && <WebsiteScore name={why.name} website={website} />}
      {website.checked && website.status === "read" ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <WebsiteSays name={why.name} services={website.services} claims={website.claims} />
          {website.compare && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">What each website shows AI tools</h3>
              <WebsiteCompare name={why.name} rows={website.compare} />
              <p className="text-xs text-text-hint">From the pages we read on each website, about 5 each.</p>
            </section>
          )}
        </div>
      ) : website.checked ? (
        <p className="text-sm text-muted-foreground">
          {website.status === "blocked" ? "Their website turns readers away, so there is nothing to compare." : "Their website didn't load when we checked it."}
        </p>
      ) : (
        <p className="max-w-prose text-sm text-muted-foreground">
          Checking reads their website once and keeps it: the services it lists, what it says that customers ask about, and what it
          shows AI tools. Your website is read the same way, so the two are compared fairly.
        </p>
      )}
    </div>
  );
}
