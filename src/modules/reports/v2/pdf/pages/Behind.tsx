import { Page, Text, View } from "@react-pdf/renderer";
import type { ReportSnapshot } from "../../snapshot-schema";
import { Footer, Header } from "../chrome";
import type { ReportCtx } from "../context";
import { fixedBy } from "../format";
import { Card, SectionHead } from "../primitives";
import { COLORS, lines, s } from "../theme";

type Reason = ReportSnapshot["behind"]["reasons"][number];

function ReasonRow({ ctx, reason }: { ctx: ReportCtx; reason: Reason }) {
  return (
    <View wrap={false} style={[s.row, { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.divider }]}>
      <View style={{ width: 173, paddingRight: 14 }}>
        <Text style={[{ fontSize: 11, fontWeight: 700, lineHeight: 1.35 }, lines(2)]}>{reason.title}</Text>
        {reason.fixes.length > 0 ? (
          <Text style={{ fontSize: 9, fontWeight: 700, color: ctx.accent, marginTop: 3 }}>{fixedBy(reason.fixes)}</Text>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[{ fontSize: 10, color: COLORS.secondary, marginBottom: 5 }, lines(2)]}>
          <Text style={{ fontWeight: 700, color: COLORS.ink }}>Them: </Text>
          {reason.them}
        </Text>
        <Text style={[{ fontSize: 10, color: COLORS.secondary }, lines(2)]}>
          <Text style={{ fontWeight: 700, color: COLORS.problem }}>You: </Text>
          {reason.you}
        </Text>
      </View>
    </View>
  );
}

export function Behind({ ctx }: { ctx: ReportCtx }) {
  const { behind } = ctx.snapshot;
  return (
    <Page size="LETTER" style={s.page}>
      <Header ctx={ctx} />
      <SectionHead ctx={ctx} section="behind" headline={behind.headline} lead={behind.line} />

      <View style={{ borderTopWidth: 1, borderTopColor: COLORS.divider, marginBottom: 22 }}>
        {behind.reasons.length > 0 ? (
          behind.reasons.map((reason) => <ReasonRow key={reason.title} ctx={ctx} reason={reason} />)
        ) : (
          <Text style={{ fontSize: 10, color: COLORS.secondary, paddingTop: 12 }}>
            No tracked competitor is ahead of you in these answers.
          </Text>
        )}
      </View>

      {behind.wins ? (
        <Card style={{ paddingHorizontal: 16, paddingTop: 15, paddingBottom: 15 }}>
          <Text style={{ fontSize: 11, fontWeight: 600, marginBottom: 5 }}>Where you already win</Text>
          <Text style={[{ fontSize: 9.75, color: COLORS.secondary, lineHeight: 1.5 }, lines(4)]}>{behind.wins}</Text>
        </Card>
      ) : null}
      <Footer ctx={ctx} />
    </Page>
  );
}
