import { Check, X } from "lucide-react";
import { RadarChart } from "@/components/charts";
import { AiMessage, Explain } from "@/components/checkin";
import type { WhyPanel } from "@/modules/competitors";
import { measures, type Measure } from "./website-measures";

type Website = WhyPanel["website"];

/** The lead and the line under it, from the measures where both sites were read the same way. */
function words(name: string, rows: Measure[]): { lead: string; explain: string | null } {
  const both = rows.filter((m) => m.them && m.you);
  if (both.length === 0) return { lead: `Here's what ${name}'s website gives AI.`, explain: "Your website wasn't read the same way, so only theirs is drawn." };
  const theirs = both.filter((m) => m.them!.score > m.you!.score);
  const yours = both.filter((m) => m.you!.score > m.them!.score);
  // "What AI tools can find" reads "what AI tools can find" mid-sentence: only the first letter drops.
  const list = (ms: Measure[]) => ms.map((m) => m.title.charAt(0).toLowerCase() + m.title.slice(1)).join(", ");
  if (theirs.length > yours.length) {
    return {
      lead: "Their website also gives AI more to work with.",
      explain: `${name}'s website is ahead on ${list(theirs)}.${yours.length ? ` Yours is ahead on ${list(yours)}.` : ""}`,
    };
  }
  if (yours.length > theirs.length) {
    return { lead: "Your website gives AI more to work with than theirs.", explain: `Yours is ahead on ${list(yours)}.${theirs.length ? ` Theirs is ahead on ${list(theirs)}.` : ""}` };
  }
  return { lead: "Your two websites give AI about the same to work with.", explain: null };
}

const checkedOn = (iso: string | null) => (iso ? ` Checked ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.` : "");

/**
 * C-Compare's website message: the website measures as a radar, them in coral under you in blue, and beside it the
 * checks AI tools use, with a word next to every mark. Shown once their website has been read (the Website tab
 * offers the check before that).
 */
export function WebsiteCard({ name, website, index }: { name: string; website: Website; index: number }) {
  if (!website.checked || website.status !== "read") return null;
  const rows = measures(website);
  const { lead, explain } = words(name, rows);
  const checks = (website.compare ?? []).filter((r) => typeof r.them === "boolean");
  const drawn = rows.filter((m) => m.them !== null || m.you !== null);
  return (
    <AiMessage index={index}>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
          <h2 className="font-serif text-[20px] leading-[1.35] font-normal sm:text-[22px]">{lead}</h2>
          {(explain || website.checkedAt) && (
            <Explain>
              {explain}
              {checkedOn(website.checkedAt)}
            </Explain>
          )}
          {checks.length > 0 && (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="w-[52%] py-1.5 text-left font-normal">
                    <span className="sr-only">Check</span>
                  </th>
                  <th className="truncate py-1.5 text-center font-normal">{name}</th>
                  <th className="py-1.5 text-center font-normal">You</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((r) => (
                  <tr key={r.label} className="border-t border-track">
                    <th scope="row" className="py-2 pr-2 text-left font-normal">
                      {r.label}
                    </th>
                    <Mark value={r.them as boolean | null} />
                    <Mark value={r.you as boolean | null} />
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {drawn.length >= 3 && (
          <div className="flex min-w-[280px] flex-[1_1_320px]">
            <RadarChart
            axes={drawn.map((m) => m.axis)}
            you={drawn.map((m) => m.you?.score ?? 0)}
            rival={drawn.map((m) => m.them?.score ?? 0)}
            rivalName={name}
            ariaLabel={`Website measures, 0 to 100. ${drawn.map((m) => `${m.title}: ${name} ${m.them?.label ?? "not checked"}, you ${m.you?.label ?? "not checked"}`).join(". ")}.`}
            />
          </div>
        )}
      </div>
    </AiMessage>
  );
}

function Mark({ value }: { value: boolean | null }) {
  if (value === null) return <td className="py-2 text-center text-xs text-muted-foreground">Not checked</td>;
  return (
    <td className="py-2">
      <span className={value ? "flex items-center justify-center gap-1 text-xs font-semibold text-brand" : "flex items-center justify-center gap-1 text-xs font-semibold text-danger"}>
        {value ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
        {value ? "Yes" : "No"}
      </span>
    </td>
  );
}
