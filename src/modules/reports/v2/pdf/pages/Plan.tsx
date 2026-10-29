import { Page, Text, View } from "@react-pdf/renderer";
import type { ReportSnapshot } from "../../snapshot-schema";
import { Footer, Header } from "../chrome";
import type { ReportCtx } from "../context";
import { LEVEL_LABEL, fixList, plural } from "../format";
import { Card, PriorityBadge, SectionHead, SubHead } from "../primitives";
import { COLORS, lines, s } from "../theme";

const COL = { n: 27, fix: 218, where: 150, priority: 72 } as const;

function TableHead() {
  return (
    <View style={[s.row, { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: COLORS.muted }]}>
      {(
        [
          ["#", COL.n],
          ["Fix", COL.fix],
          ["Where", COL.where],
          ["Priority", COL.priority],
        ] as const
      ).map(([label, width]) => (
        <Text key={label} style={{ width, fontSize: 9, color: COLORS.muted }}>
          {label}
        </Text>
      ))}
      <Text style={{ flex: 1, fontSize: 9, color: COLORS.muted }}>Effort</Text>
    </View>
  );
}

function FixRow({ ctx, fix }: { ctx: ReportCtx; fix: ReportSnapshot["fixes"][number] }) {
  return (
    <View
      wrap={false}
      style={[s.row, { alignItems: "center", minHeight: 29, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.divider }]}
    >
      <Text style={{ width: COL.n, fontSize: 10.5, fontWeight: 600 }}>{fix.n}</Text>
      <Text style={[{ width: COL.fix, paddingRight: 10, fontSize: 10.5, fontWeight: 500 }, lines(1)]}>{fix.title}</Text>
      <Text style={[{ width: COL.where, paddingRight: 8, fontSize: 9.5, fontWeight: 600, color: ctx.accent, lineHeight: 1.25 }, lines(2)]}>
        {fix.where}
      </Text>
      <View style={{ width: COL.priority }}>
        <PriorityBadge priority={fix.priority} />
      </View>
      <Text style={{ flex: 1, fontSize: 10.5 }}>{LEVEL_LABEL[fix.effort]}</Text>
    </View>
  );
}

function AreaCard({ ctx, area, textLines }: { ctx: ReportCtx; area: ReportSnapshot["areas"][number]; textLines: number }) {
  return (
    <Card style={{ width: "49%", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 11, marginBottom: 8 }}>
      <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }]}>
        <Text style={[{ fontSize: 11, fontWeight: 600, flex: 1, paddingRight: 8 }, lines(1)]}>{area.label}</Text>
        {area.fixes.length > 0 ? (
          <Text style={{ fontSize: 9, fontWeight: 700, color: ctx.accent, paddingTop: 1.5 }}>{fixList(area.fixes)}</Text>
        ) : null}
      </View>
      <Text style={[{ fontSize: 9.75, color: COLORS.secondary, lineHeight: 1.45 }, lines(textLines)]}>{area.text}</Text>
    </Card>
  );
}

export function Plan({ ctx }: { ctx: ReportCtx }) {
  const { fixes, areas } = ctx.snapshot;
  // Up to 8 areas (4 rows of cards): past 6, each card gets one line so the page still holds the whole table.
  const areaLines = areas.length > 6 ? 1 : 2;
  const headline =
    fixes.length === 0
      ? "No fixes this period"
      : fixes.length === 1
        ? "1 fix to make first"
        : `${fixes.length} ${plural(fixes.length, "fix", "fixes")}, ranked by impact`;
  return (
    <Page size="LETTER" style={s.page}>
      <Header ctx={ctx} />
      <SectionHead
        ctx={ctx}
        section="plan"
        headline={headline}
        lead={
          fixes.length > 0
            ? "Each fix says where the change happens, who owns it and how we will know it worked."
            : "These answers did not show a gap worth a fix. We will check again in the next scan."
        }
      />

      {fixes.length > 0 ? (
        <View style={{ marginBottom: 20 }}>
          <TableHead />
          {fixes.map((fix) => (
            <FixRow key={fix.n} ctx={ctx} fix={fix} />
          ))}
        </View>
      ) : null}

      {areas.length > 0 ? (
        <>
          <SubHead minPresenceAhead={80}>Where to make the changes</SubHead>
          <View style={[s.row, { flexWrap: "wrap", justifyContent: "space-between" }]}>
            {areas.map((area) => (
              <AreaCard key={area.area + area.label} ctx={ctx} area={area} textLines={areaLines} />
            ))}
          </View>
        </>
      ) : null}
      <Footer ctx={ctx} />
    </Page>
  );
}
