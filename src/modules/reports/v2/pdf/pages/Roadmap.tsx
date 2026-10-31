import { Page, Text, View } from "@react-pdf/renderer";
import type { ReportSnapshot } from "../../snapshot-schema";
import { Footer, Header } from "../chrome";
import type { ReportCtx } from "../context";
import { formatDate, plural } from "../format";
import { FIXES_PER_PAGE } from "../layout";
import { Card, SectionHead } from "../primitives";
import { COLORS, lines, s } from "../theme";
import { fitFixPage } from "../fit";
import { FixCard } from "./FixCard";

/** The fix cards, two to a page, under the "Action plan, continued" header. */
export function FixPages({ ctx }: { ctx: ReportCtx }) {
  const { fixes } = ctx.snapshot;
  if (fixes.length === 0) return null;
  const fits = Array.from({ length: Math.ceil(fixes.length / FIXES_PER_PAGE) }, (_, page) =>
    fitFixPage(fixes.slice(page * FIXES_PER_PAGE, (page + 1) * FIXES_PER_PAGE), ctx.measure),
  ).flat();
  return (
    <Page size="LETTER" style={[s.page, { paddingTop: 78 }]}>
      <Header ctx={ctx} continued />
      {ctx.snapshot.fixes.map((fix, i) => (
        <FixCard key={fix.n} ctx={ctx} fix={fix} fit={fits[i]} breakBefore={i > 0 && i % FIXES_PER_PAGE === 0} />
      ))}
      <Footer ctx={ctx} />
    </Page>
  );
}

type Column = ReportSnapshot["roadmap"]["columns"][number];

function RoadmapColumn({ ctx, column }: { ctx: ReportCtx; column: Column }) {
  return (
    <Card style={{ flex: 1, paddingHorizontal: 13, paddingTop: 14, paddingBottom: 13 }}>
      <Text style={{ fontSize: 9, fontWeight: 700, color: ctx.accent, marginBottom: 8 }}>{column.days}</Text>
      <Text style={[{ fontSize: 12.5, fontWeight: 700, marginBottom: 9 }, lines(2)]}>{column.title}</Text>
      {column.tasks.slice(0, 4).map((task, i) => (
        <View key={i} style={{ marginBottom: 8 }}>
          <Text style={[{ fontSize: 10, fontWeight: 600, lineHeight: 1.3 }, lines(2)]}>{task.label}</Text>
          <Text style={[{ fontSize: 9, color: COLORS.muted, marginTop: 1 }, lines(1)]}>{task.area}</Text>
        </View>
      ))}
      <View style={{ flexGrow: 1 }} />
      <Text style={[{ fontSize: 9.5, color: COLORS.secondary, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 10, marginTop: 2 }, lines(3)]}>
        <Text style={{ fontWeight: 700, color: COLORS.ink }}>Goal: </Text>
        {column.goal}
      </Text>
    </Card>
  );
}

function Strip({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, paddingRight: 10 }}>
      <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 3 }}>{label}</Text>
      <Text style={[{ fontSize: 11, fontWeight: 700 }, lines(1)]}>{value}</Text>
    </View>
  );
}

export function Roadmap({ ctx }: { ctx: ReportCtx }) {
  const { roadmap, coverage } = ctx.snapshot;
  return (
    <Page size="LETTER" style={s.page}>
      <Header ctx={ctx} />
      <SectionHead
        ctx={ctx}
        section="roadmap"
        headline="Quick wins first, then proof, then reach"
        lead="Most of the first month is setup work that only has to be done once."
      />
      <View style={[s.row, { gap: 11, marginBottom: 16 }]}>
        {roadmap.columns.map((column) => (
          <RoadmapColumn key={column.days} ctx={ctx} column={column} />
        ))}
      </View>
      <Card style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}>
        <View style={s.row}>
          <Strip label="Next scan" value={roadmap.nextScanAt ? formatDate(roadmap.nextScanAt) : "Not booked yet"} />
          <Strip
            label={`Same ${coverage.questions} ${plural(coverage.questions, "question")}`}
            value="So results compare fairly"
          />
          <Strip label="Each fix re-checked" value="Done, moving or stuck" />
        </View>
      </Card>
      <Footer ctx={ctx} />
    </Page>
  );
}
