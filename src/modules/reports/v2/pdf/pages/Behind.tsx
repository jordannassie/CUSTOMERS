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

/**
 * Nobody tracked is ahead: the tracked businesses and how often AI named each, and what this page will show, instead
 * of one line on an empty page (BUG-319).
 */
function NobodyAhead({ ctx }: { ctx: ReportCtx }) {
  const { businesses } = ctx.snapshot;
  const named = (n: number) => (n === 0 ? "Not named in any answer" : `Named in ${n} ${n === 1 ? "answer" : "answers"}`);
  return (
    <View style={{ paddingTop: 12 }}>
      <Text style={{ fontSize: 10, color: COLORS.secondary, marginBottom: 10 }}>No tracked competitor is ahead of you in these answers.</Text>
      {businesses.map((b) => (
        <View key={b.name} wrap={false} style={[s.row, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.divider }]}>
          <Text style={[{ flex: 1, fontSize: 10.5, fontWeight: b.isYou ? 700 : 600 }, lines(1)]}>{b.isYou ? `${b.name} (you)` : b.name}</Text>
          <Text style={{ fontSize: 10, color: COLORS.secondary }}>{named(b.mentions)}</Text>
        </View>
      ))}
      <Text style={{ fontSize: 9.75, color: COLORS.secondary, lineHeight: 1.5, marginTop: 12 }}>
        When AI names one of them instead of you, this page shows why it picked them and what to change.
      </Text>
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
          <NobodyAhead ctx={ctx} />
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
