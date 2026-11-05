import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { AiMessage, CheckInLayout, FollowUps, UserBubble } from "@/components/checkin/Conversation";
import { ListedFirst } from "@/components/sources/ListedFirst";
import { SitesTable } from "@/components/sources/SitesTable";
import { SourceDonut } from "@/components/sources/SourceDonut";
import { SourceMix } from "@/components/sources/SourceMix";
import { SourcesEmpty } from "@/components/sources/SourcesEmpty";
import { SourcesRail } from "@/components/sources/SourcesRail";
import { SourceTypes } from "@/components/sources/SourceTypes";
import { ToolFilter } from "@/components/sources/ToolFilter";
import { plural, shareOfThem, shortHost } from "@/components/sources/status";
import { Button } from "@/components/ui/button";
import { questionsHref } from "@/lib/questions-href";
import { addToActions } from "@/modules/opportunities";
import { TOOL_LABELS, getSources, toolFromParam } from "@/modules/sources";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Sources", robots: { index: false } };

type Props = { searchParams: Promise<{ tool?: string | string[] }> };

// B-54, MVP_SPEC 8.1, Check-in theme (docs/design/files/C-Sources.dc.html): the websites AI used for this business's
// questions, told as a conversation. Which sites mention you, skip you or belong to a rival, your own site, where to
// get listed first, then every site. ?tool= filters every number to one AI tool.
export default async function SourcesPage({ searchParams }: Props) {
  const workspace = await getWorkspace({ next: "/sources" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const tool = toolFromParam((await searchParams).tool);
  const sources = await getSources(business.id, tool);
  if (!sources) notFound();
  const where = sources.place ? ` in ${sources.place}` : "";
  const toolLabel = tool ? TOOL_LABELS[tool] : null;
  const who = toolLabel ?? "AI";
  const paused = business.status === "paused";
  const answers = plural(sources.answers, "answer");
  const hasSites = sources.answersAllTools > 0 && sources.answers > 0 && sources.sites.length > 0;
  const top = sources.topSource;

  const header = (
    <PageHeader
      title={
        <>
          Sources <SampleDataBadge show={workspace.account?.isTest} />
        </>
      }
      description={
        <>
          Websites AI used in the last 30 days to answer customer questions{where}. Being listed on them helps AI
          recommend you.
        </>
      }
      actions={sources.answersAllTools > 0 ? <ToolFilter tool={tool} /> : undefined}
    />
  );

  return (
    <CheckInLayout
      railLabel="Source summary"
      rail={
        hasSites ? (
          <SourcesRail
            answers={sources.answers}
            sitesUsed={sources.sitesUsed}
            sites={sources.sites}
            topSource={top}
            topMentioning={sources.topMentioning}
            ownSite={sources.ownSite}
            competitorSiteTimes={sources.competitorSiteTimes}
            toolLabel={toolLabel}
          />
        ) : undefined
      }
    >
      {header}

      {paused && sources.answersAllTools > 0 && (
        <p className="rounded-lg bg-surface px-4 py-3 text-[13px] text-ink-2" data-testid="scans-paused">
          Scans are paused for this business, so these numbers stay as they are until scans start again.{" "}
          <Link href="/settings/billing" className="font-semibold text-brand-strong underline-offset-4 hover:underline">
            Go to Billing
          </Link>
        </p>
      )}

      {sources.answersAllTools === 0 ? (
        paused ? (
          <SourcesEmpty testId="scans-paused" title="Scans are paused">
            This business has no answers in the last 30 days because its scans are paused. Turn them back on in Billing.
            <Button asChild className="mt-4 w-fit">
              <Link href="/settings/billing">Go to Billing</Link>
            </Button>
          </SourcesEmpty>
        ) : (
          <SourcesEmpty testId="no-scans" title="No scans yet">
            Run your first scan from the Overview to see which websites AI uses.
            <Button asChild className="mt-4 w-fit">
              <Link href="/dashboard">Go to Overview</Link>
            </Button>
          </SourcesEmpty>
        )
      ) : sources.answers === 0 ? (
        <SourcesEmpty testId="no-tool-answers" title={`No ${toolLabel} answers yet`}>
          {toolLabel} gave no answers for this business in the last 30 days.
          <Button asChild variant="outline" className="mt-4 w-fit">
            <Link href="/sources">See all tools</Link>
          </Button>
        </SourcesEmpty>
      ) : sources.sites.length === 0 ? (
        <SourcesEmpty testId="no-sources" title="No websites cited yet">
          {toolLabel ?? "AI"} gave {answers} without linking to any websites. Sources show up here as more scans run.
        </SourcesEmpty>
      ) : (
        <>
          <UserBubble>Where does {toolLabel ?? "AI"} look before it names a business like mine?</UserBubble>

          <AiMessage
            place="first"
            leadSize="lg"
            index={0}
            lead={
              <>
                {who} used {plural(sources.sitesUsed, "website")} across {answers}.
                {top ? ` ${top.host} was used in ${shareOfThem(top.answers, sources.answers)}.` : ""}
              </>
            }
          >
            <SourceMix sites={sources.sites} moreSites={sources.moreSites} />
          </AiMessage>

          <AiMessage index={1}>
            <SourceDonut sites={sources.sites} answers={sources.answers} moreSites={sources.moreSites} ownSite={sources.ownSite} toolLabel={toolLabel} />
          </AiMessage>

          <AiMessage index={2} lead="The kinds of websites behind those answers." aside={<span className="text-xs text-muted-foreground">Share of {answers}</span>}>
            <SourceTypes types={sources.types} answers={sources.answers} />
          </AiMessage>

          <AiMessage
            index={3}
            lead="Where I'd act first:"
            aside={
              <Link href="/actions" className="text-[13px] font-semibold text-brand-strong underline-offset-4 hover:underline">
                Open Actions
              </Link>
            }
          >
            <ListedFirst businessId={business.id} listed={sources.listed} add={addToActions} />
          </AiMessage>

          <AiMessage place="last" index={4} className="gap-0 px-0 py-2 sm:px-0">
            <SitesTable businessId={business.id} rows={sources.sites} answers={sources.answers} moreSites={sources.moreSites} add={addToActions} bare />
          </AiMessage>

          <FollowUps
            items={[
              ...(top ? [{ label: `Show me the answers that used ${shortHost(top.host)}`, href: questionsHref({ site: top.host }) }] : []),
              ...(sources.ownSite.host ? [{ label: "How do I get my site read?", href: "/actions" }] : []),
              ...(tool ? [{ label: "Show every AI tool", href: "/sources" }] : []),
              { label: "Back to this month's check-in", href: "/dashboard" },
            ]}
          />
        </>
      )}
    </CheckInLayout>
  );
}
