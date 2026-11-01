import { Page, Text, View } from "@react-pdf/renderer";
import { Footer, Header } from "../chrome";
import type { ReportCtx } from "../context";
import { LEVEL_LABEL, plural } from "../format";
import { BigNumber, Card, NumCircle, SectionHead, SubHead } from "../primitives";
import { COLORS, lines, s } from "../theme";

function Kpi({
  label,
  value,
  unit,
  note,
  problem = false,
  noteProblem = false,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
  problem?: boolean;
  noteProblem?: boolean;
}) {
  return (
    <Card style={{ flex: 1, paddingHorizontal: 13, paddingTop: 13, paddingBottom: 11 }}>
      <Text style={[{ fontSize: 9, color: COLORS.secondary, marginBottom: 8 }, lines(1)]}>{label}</Text>
      <BigNumber value={value} unit={unit} size={25} problem={problem} />
      <Text
        style={[{ fontSize: 9, color: noteProblem ? COLORS.problem : COLORS.muted, marginTop: 7, lineHeight: 1.3 }, lines(2)]}
      >
        {note}
      </Text>
    </Card>
  );
}

function scoreNote(ctx: ReportCtx): { text: string; problem: boolean } {
  const change = ctx.snapshot.score.change;
  const days = ctx.snapshot.period.days;
  if (!change) return { text: "No clear change on the 30 days before", problem: false };
  if (change.points === 0) return { text: `Same as previous ${days} days`, problem: false };
  const word = change.direction === "up" ? "Up" : "Down";
  return { text: `${word} ${change.points} vs previous ${days} days`, problem: change.direction === "down" };
}

function KpiRow({ ctx }: { ctx: ReportCtx }) {
  const { score, named, rank, ownSite } = ctx.snapshot;
  const change = scoreNote(ctx);
  const leader = rank?.leader;
  const rankNote = !rank
    ? "No tracked business was named"
    : rank.position === 1
      ? "You lead the tracked businesses"
      : leader
        ? `Leader: ${leader.name}, ${leader.score}`
        : "Leader not known";
  return (
    <View style={[s.row, { gap: 9, marginBottom: 18 }]}>
      <Kpi
        label="Visibility score"
        value={String(score.value)}
        unit="/100"
        note={change.text}
        problem={score.value === 0}
        noteProblem={change.problem}
      />
      <Kpi
        label="Answers naming you"
        value={String(named.answers)}
        unit={`of ${named.total}`}
        note={`In ${named.questions} of ${named.questionsAsked} questions`}
        problem={named.answers === 0}
      />
      <Kpi
        label={rank ? `Rank among ${rank.of} tracked` : "Rank among tracked"}
        value={rank ? `#${rank.position}` : "None"}
        note={rankNote}
      />
      {ownSite.hasSite ? (
        <Kpi
          label="Your website used"
          value={String(ownSite.cited)}
          unit={plural(ownSite.cited, "time")}
          note={`Other business sites: ${ownSite.otherSites} ${plural(ownSite.otherSites, "time")}`}
          problem={ownSite.cited === 0}
        />
      ) : (
        <Kpi label="Your website used" value="None" note="No website on file" problem />
      )}
    </View>
  );
}

function ShortCard({ label, text }: { label: string; text: string }) {
  return (
    <Card style={{ flex: 1, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 13 }}>
      <Text style={[s.caps, { marginBottom: 7 }]}>{label}</Text>
      <Text style={[{ fontSize: 10.5, lineHeight: 1.5 }, lines(6)]}>{text}</Text>
    </Card>
  );
}

export function Summary({ ctx }: { ctx: ReportCtx }) {
  const snap = ctx.snapshot;
  const top = snap.fixes.slice(0, 3);
  return (
    <Page size="LETTER" style={s.page}>
      <Header ctx={ctx} />
      <SectionHead ctx={ctx} section="summary" headline={snap.summary.headline} lead={snap.summary.lead} />
      <KpiRow ctx={ctx} />

      <SubHead>The short version</SubHead>
      <View style={[s.row, { gap: 9, marginBottom: 18 }]}>
        <ShortCard label="WHAT AI KNOWS" text={snap.summary.short.knows} />
        <ShortCard label="WHY YOU ARE BEHIND" text={snap.summary.short.behind} />
        <ShortCard label="WHAT FIXES IT" text={snap.summary.short.fixes} />
      </View>

      {top.length > 0 ? (
        <View wrap={false}>
          <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }]}>
            <Text style={{ fontSize: 11, fontWeight: 600 }}>What to do first</Text>
            <Text style={{ fontSize: 9, color: COLORS.muted }}>
              {snap.fixes.length > 3 ? `All ${snap.fixes.length} fixes` : "The fixes"} start on page {ctx.pages.plan}
            </Text>
          </View>
          {top.map((fix) => (
            <View key={fix.n} style={[s.row, { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingVertical: 11 }]}>
              <View style={{ paddingTop: 2 }}>
                <NumCircle n={fix.n} />
              </View>
              <View style={{ flex: 1, marginLeft: 13 }}>
                <Text style={[{ fontSize: 11, fontWeight: 600, marginBottom: 2 }, lines(1)]}>{fix.title}</Text>
                <Text style={[{ fontSize: 9.5, color: COLORS.secondary }, lines(1)]}>
                  {`Where: ${fix.where} · Owner: ${fix.owner} · Effort: ${LEVEL_LABEL[fix.effort].toLowerCase()}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <Footer ctx={ctx} />
    </Page>
  );
}
