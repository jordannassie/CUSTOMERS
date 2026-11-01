// The 90 day roadmap: quick wins first, then proof, then reach. Each fix lands in one column by its priority and
// effort; each column ends with a goal. Pure.
import type { ReportFix, ReportSnapshot } from "./snapshot-schema";

type Roadmap = ReportSnapshot["roadmap"];
type Column = Roadmap["columns"][number];

const FIRST_MONTH_MAX = 3;
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** 0, 1 or 2: the column a fix starts in. Critical and quick fixes first; low priority last. */
export function columnOf(fix: Pick<ReportFix, "priority" | "effort">): 0 | 1 | 2 {
  if (fix.priority === "critical") return 0;
  if (fix.priority === "low") return 2;
  return fix.effort === "low" ? 0 : 1;
}

const task = (fix: ReportFix) => ({ label: `Fix ${fix.n}: ${lowerFirst(fix.title)}`, area: fix.where });

function goalOf(fixes: ReportFix[], fallback: string): string {
  const own = fixes.find((f) => f.key === "own_site_uncited" || f.key === "no_site");
  if (own) return "your website appears as a source";
  const first = fixes[0];
  return first ? lowerFirst(first.goal.text) : fallback;
}

export function buildRoadmap(fixes: ReportFix[], opts: { leader: string | null; nextScanAt: string | null }): Roadmap {
  const groups: ReportFix[][] = [[], [], []];
  for (const fix of fixes) groups[columnOf(fix)].push(fix);
  // A month holds about 3 fixes; the rest of the quick ones wait for the second month.
  groups[1].unshift(...groups[0].splice(FIRST_MONTH_MAX));

  const reviews = fixes.some((f) => f.areas.includes("reviews"));
  const columns: Column[] = [
    {
      days: "Days 1 to 30",
      title: "Fix the basics",
      tasks: groups[0].map(task),
      goal: goalOf(groups[0], "your listings and website are complete"),
    },
    {
      days: "Days 31 to 60",
      title: "Build proof",
      tasks: [...groups[1].map(task), ...(reviews ? [{ label: "Weekly review requests", area: "Review sites, Google" }] : [])],
      goal: goalOf(groups[1], "first mentions for the questions you are missing"),
    },
    {
      days: "Days 61 to 90",
      title: "Grow reach",
      tasks: [
        ...groups[2].map(task),
        { label: "Check what moved", area: "All areas" },
        { label: "Reset priorities for the next 90 days", area: "Report review call" },
      ],
      goal: opts.leader ? `close the gap to ${opts.leader}` : "keep your lead over the businesses you track",
    },
  ];
  // An empty first month still says what to do.
  if (columns[0].tasks.length === 0) columns[0].tasks.push({ label: "Check your website and listings are up to date", area: "All areas" });
  if (columns[1].tasks.length === 0) columns[1].tasks.push({ label: "Ask happy customers for reviews", area: "Review sites, Google" });
  return { columns, nextScanAt: opts.nextScanAt };
}
