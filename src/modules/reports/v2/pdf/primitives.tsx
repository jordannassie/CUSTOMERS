import type { ReactNode } from "react";
import { Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { Priority } from "../snapshot-schema";
import type { ReportCtx } from "./context";
import { PRIORITY_LABEL } from "./format";
import { CONTENT_WIDTH, COLORS, lines, s } from "./theme";
import { SECTIONS, balancedWidth, sectionNumber, type SectionKey } from "./layout";

/** "02 · WHAT AI KNOWS ABOUT YOU", the headline and the lead line that open each section. */
export function SectionHead({
  ctx,
  section,
  headline,
  lead,
  leadLines = 3,
}: {
  ctx: ReportCtx;
  section: SectionKey;
  headline: string;
  lead?: string | null;
  /** Lines the lead may use; the headline always gets 2. */
  leadLines?: number;
}) {
  const label = `${sectionNumber(section)} · ${SECTIONS.find((x) => x.key === section)!.label}`.toUpperCase();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={[s.sectionLabel, { color: ctx.accent }]}
        render={({ pageNumber, totalPages }) => {
          ctx.probe.record(section, pageNumber, totalPages);
          return label;
        }}
      />
      <Text style={[s.h1, { maxWidth: balancedWidth(headline, CONTENT_WIDTH) }, lines(2)]}>{headline}</Text>
      {lead ? <Text style={[s.lead, lines(leadLines)]}>{lead}</Text> : null}
    </View>
  );
}

/** A white card with a 1pt border. Never split across pages. */
export function Card({ style, children }: { style?: Style | Style[]; children: ReactNode }) {
  const extra = Array.isArray(style) ? style : style ? [style] : [];
  return (
    <View wrap={false} style={[s.card, ...extra]}>
      {children}
    </View>
  );
}

/** A sub heading that stays with at least `minPresenceAhead` points of what follows it. */
export function SubHead({ children, style, minPresenceAhead = 60 }: { children: string; style?: Style; minPresenceAhead?: number }) {
  return (
    <Text minPresenceAhead={minPresenceAhead} style={style ? [s.h2, style] : s.h2}>
      {children}
    </Text>
  );
}

const BADGE: Record<Priority, { color: string; border: string }> = {
  critical: { color: COLORS.problem, border: COLORS.problem },
  high: { color: COLORS.ink, border: COLORS.ink },
  medium: { color: COLORS.secondary, border: COLORS.muted },
  low: { color: COLORS.muted, border: COLORS.border },
};

/** Outlined priority pill; the word carries the meaning, the colour only repeats it. */
export function PriorityBadge({ priority }: { priority: Priority }) {
  const look = BADGE[priority];
  return (
    <View style={{ flexDirection: "row" }}>
      <Text
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: look.color,
          borderWidth: 1,
          borderColor: look.border,
          borderRadius: 9,
          paddingTop: 2.5,
          paddingBottom: 2,
          paddingHorizontal: 6.5,
          lineHeight: 1.2,
        }}
      >
        {PRIORITY_LABEL[priority]}
      </Text>
    </View>
  );
}

/** A black circle with a white number: the fix number on the summary and the fix cards. */
export function NumCircle({ n, size = 19 }: { n: number; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: COLORS.white, fontSize: size * 0.42, fontWeight: 700, lineHeight: 1 }}>{n}</Text>
    </View>
  );
}

/** A big number with an optional smaller unit after it ("15/100", "9 of 60", "0 times"). */
export function BigNumber({
  value,
  unit,
  size,
  problem = false,
}: {
  value: string;
  unit?: string;
  size: number;
  problem?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
      <Text style={{ fontSize: size, fontWeight: 700, lineHeight: 1, color: problem ? COLORS.problem : COLORS.ink }}>
        {value}
      </Text>
      {unit ? (
        <Text style={{ fontSize: size * 0.42, fontWeight: 600, color: COLORS.muted, marginLeft: 2, lineHeight: 1 }}>
          {unit}
        </Text>
      ) : null}
    </View>
  );
}
