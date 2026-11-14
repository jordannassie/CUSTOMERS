import { Text, View } from "@react-pdf/renderer";
import type { ReportFix } from "../../snapshot-schema";
import type { ReportCtx } from "../context";
import { FIX_TYPE, type FixLines } from "../fit";
import { LEVEL_LABEL } from "../format";
import { Card, NumCircle, PriorityBadge } from "../primitives";
import { COLORS, lines, s } from "../theme";

// One fix of the action plan. fit.ts sets each text's line limit so two cards always fit a page; the spacing here is
// what fit.ts counts as CARD_FIXED, so change both together.

const LABEL = { fontSize: 9, fontWeight: 600, color: COLORS.secondary, marginBottom: 2.5 } as const;

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <Text style={[{ fontSize: 9, color: COLORS.muted, marginRight: 16 }, lines(1)]}>
      {label}: <Text style={{ fontWeight: 600, color: COLORS.ink }}>{value}</Text>
    </Text>
  );
}

function Block({ label, text, maxLines }: { label: string; text: string; maxLines: number }) {
  return (
    <View style={{ marginBottom: 7 }}>
      <Text style={LABEL}>{label}</Text>
      <Text style={[{ fontSize: FIX_TYPE.body.size, lineHeight: FIX_TYPE.body.lineHeight }, lines(maxLines)]}>{text}</Text>
    </View>
  );
}

export function FixCard({
  ctx,
  fix,
  fit,
  breakBefore,
}: {
  ctx: ReportCtx;
  fix: ReportFix;
  /** Line limits from fitFixPage. */
  fit: FixLines;
  breakBefore: boolean;
}) {
  return (
    <View break={breakBefore} wrap={false} style={{ marginBottom: 15 }}>
      <Card style={{ paddingHorizontal: 17, paddingTop: 14, paddingBottom: 11 }}>
        <View style={[s.row, { alignItems: "center", justifyContent: "space-between" }]}>
          <View style={[s.row, { alignItems: "center", flex: 1, paddingRight: 12 }]}>
            <NumCircle n={fix.n} size={22} />
            <Text style={[{ fontSize: 15, fontWeight: 700, marginLeft: 9, flex: 1 }, lines(1)]}>{fix.title}</Text>
          </View>
          <PriorityBadge priority={fix.priority} />
        </View>

        <View style={[s.row, { marginTop: 5, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: COLORS.divider }]}>
          <Text style={[{ fontSize: 9, color: COLORS.muted, marginRight: 16, maxWidth: 220 }, lines(1)]}>
            Where: <Text style={{ fontWeight: 600, color: ctx.accent }}>{fix.where}</Text>
          </Text>
          <MetaItem label="Impact" value={LEVEL_LABEL[fix.impact]} />
          <MetaItem label="Effort" value={LEVEL_LABEL[fix.effort]} />
          <View style={{ flex: 1 }}>
            <MetaItem label="Owner" value={fix.owner} />
          </View>
        </View>

        <View style={{ paddingTop: 8 }}>
          <Block label="What AI showed us" text={fix.evidence} maxLines={fit.evidence} />
          <Block label="Why it holds you back" text={fix.why} maxLines={fit.why} />
          <Text style={[LABEL, { marginBottom: 3 }]}>How to fix it</Text>
          {fix.steps.slice(0, 4).map((step, i) => (
            <View key={i} style={[s.row, { marginBottom: 3 }]}>
              <Text style={{ width: 13, fontSize: FIX_TYPE.step.size, fontWeight: 700, color: ctx.accent }}>{i + 1}</Text>
              <Text
                style={[{ flex: 1, fontSize: FIX_TYPE.step.size, lineHeight: FIX_TYPE.step.lineHeight }, lines(fit.steps[i])]}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={[s.row, { justifyContent: "space-between", marginTop: 3, paddingTop: 7, borderTopWidth: 1, borderTopColor: COLORS.divider }]}
        >
          <Text style={{ fontSize: FIX_TYPE.goal.size, color: COLORS.muted, marginRight: 16 }}>{fix.goal.label}</Text>
          <Text
            style={[
              { flex: 1, textAlign: "right", fontSize: FIX_TYPE.goal.size, fontWeight: 600, lineHeight: FIX_TYPE.goal.lineHeight },
              lines(fit.goal),
            ]}
          >
            {fix.goal.text}
          </Text>
        </View>
      </Card>
    </View>
  );
}
