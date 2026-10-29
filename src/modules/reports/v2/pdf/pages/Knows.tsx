import { Page, Text, View } from "@react-pdf/renderer";
import type { ReportSnapshot } from "../../snapshot-schema";
import { Footer, Header } from "../chrome";
import type { ReportCtx } from "../context";
import { engineName, formatDate } from "../format";
import { Card, SectionHead, SubHead } from "../primitives";
import { COLORS, lines, s } from "../theme";

type Knows = ReportSnapshot["knows"];
type Excerpt = NonNullable<Knows["excerpts"]["named"]>;

function FactCard({ ctx, label, card }: { ctx: ReportCtx; label: string; card: Knows["knownFor"] }) {
  return (
    <Card style={{ flex: 1, paddingHorizontal: 12, paddingTop: 13, paddingBottom: 13 }}>
      <Text style={{ fontSize: 9, fontWeight: 600, color: ctx.accent, marginBottom: 4 }}>{label}</Text>
      <Text style={[{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.3, marginBottom: 5 }, lines(2)]}>
        {card?.title ?? "Not enough answers yet"}
      </Text>
      <Text style={[{ fontSize: 9.5, color: COLORS.secondary, lineHeight: 1.4 }, lines(3)]}>
        {card?.detail ?? "AI did not say enough about this to show it."}
      </Text>
    </Card>
  );
}

function GapRow({ gap, first }: { gap: Knows["gaps"][number]; first: boolean }) {
  return (
    <View
      wrap={false}
      style={[
        s.row,
        { alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
        first ? { borderTopWidth: 1, borderTopColor: COLORS.divider } : {},
      ]}
    >
      <Text style={[{ width: 280, paddingRight: 12, fontSize: 10.5, fontWeight: 600 }, lines(2)]}>{gap.title}</Text>
      <Text style={[{ flex: 1, paddingRight: 12, fontSize: 10, color: COLORS.secondary }, lines(2)]}>{gap.evidence}</Text>
      <Text style={{ width: 34, textAlign: "right", fontSize: 9, fontWeight: 700, color: COLORS.problem }}>
        {gap.fix ? `Fix ${gap.fix}` : ""}
      </Text>
    </View>
  );
}

function ExcerptCard({ label, excerpt, empty }: { label: string; excerpt: Excerpt | null; empty: string }) {
  return (
    <Card style={{ flex: 1, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 12 }}>
      <Text style={{ fontSize: 9.5, fontWeight: 600, color: COLORS.secondary, marginBottom: 5 }}>{label}</Text>
      {excerpt ? (
        <>
          <Text style={[{ fontSize: 10.5, fontStyle: "italic", lineHeight: 1.5, marginBottom: 6 }, lines(4)]}>
            {`"${excerpt.text}"`}
          </Text>
          <Text style={[{ fontSize: 9, color: COLORS.muted, lineHeight: 1.3 }, lines(2)]}>
            {engineName(excerpt.engine)} · {formatDate(excerpt.date)} · {excerpt.question}
          </Text>
        </>
      ) : (
        <Text style={{ fontSize: 10, color: COLORS.secondary }}>{empty}</Text>
      )}
    </Card>
  );
}

export function Knows({ ctx }: { ctx: ReportCtx }) {
  const { knows, coverage } = ctx.snapshot;
  return (
    <Page size="LETTER" style={s.page}>
      <Header ctx={ctx} />
      <SectionHead
        ctx={ctx}
        section="knows"
        headline={knows.headline}
        lead={`We read all ${coverage.answers} answers. This is the picture AI builds of your business today.`}
        leadLines={1}
      />

      <SubHead>What AI says about you</SubHead>
      <View style={[s.row, { gap: 9, marginBottom: 20 }]}>
        <FactCard ctx={ctx} label="Known for" card={knows.knownFor} />
        <FactCard ctx={ctx} label="Trusted by" card={knows.trustedBy} />
        <FactCard ctx={ctx} label="Found through" card={knows.foundThrough} />
      </View>

      <View style={{ marginBottom: 20 }}>
        <SubHead style={{ marginBottom: 6 }}>What AI does not know</SubHead>
        {knows.gaps.length > 0 ? (
          knows.gaps.map((gap, i) => <GapRow key={gap.title} gap={gap} first={i === 0} />)
        ) : (
          <Text style={{ fontSize: 10, color: COLORS.secondary }}>No clear gaps showed up in these answers.</Text>
        )}
      </View>

      <View wrap={false}>
        <SubHead>What a customer actually heard</SubHead>
        <View style={[s.row, { gap: 9 }]}>
          <ExcerptCard
            label="When AI named you"
            excerpt={knows.excerpts.named}
            empty="No answer named you in this period."
          />
          <ExcerptCard
            label="When AI named a competitor instead"
            excerpt={knows.excerpts.competitor}
            empty="No answer named a competitor instead of you."
          />
        </View>
      </View>
      <Footer ctx={ctx} />
    </Page>
  );
}
