import { Link, Page, Text, View } from "@react-pdf/renderer";
import { Footer, Header } from "../chrome";
import type { ReportCtx } from "../context";
import { engineList } from "../format";
import { Card, SectionHead, SubHead } from "../primitives";
import { COLORS, lines, s } from "../theme";

function glossary(ctx: ReportCtx): Array<[string, string]> {
  const { score, named, business, businesses } = ctx.snapshot;
  const range = score.rangePoints;
  return [
    [
      "Visibility score",
      `Share of all answers that named you, out of 100. ${named.answers} of ${named.total} answers gives ${score.value}.`,
    ],
    ["Answers naming you", `Answers that mentioned ${business.name} by name, in any position.`],
    [
      "Share of picks",
      `Your part of the answers that named any tracked business.${
        businesses.length > 1 ? ` All ${businesses.length} add up to 100%.` : ""
      }`,
    ],
    ["Priority", "How soon a fix should start, set from its impact and effort."],
    ["Where", "The place the change is made: your website, Google, delivery apps, review sites, blogs or social."],
    [
      "Score range",
      `How far the score could move because AI answers vary between runs. ${
        range === null ? "Not measured for this scan." : `This scan: plus or minus ${range} points.`
      }`,
    ],
  ];
}

function Contact({ ctx }: { ctx: ReportCtx }) {
  const { name, contactEmail, bookingUrl } = ctx.snapshot.agency;
  const linkStyle = { fontSize: 10, color: COLORS.ink, textDecoration: "none" as const };
  return (
    <Card style={{ marginTop: "auto", paddingHorizontal: 18, paddingTop: 17, paddingBottom: 17 }}>
      <View style={[s.row, { justifyContent: "space-between", alignItems: "center" }]}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Questions about this report?</Text>
          <Text style={[{ fontSize: 10, color: COLORS.secondary }, lines(2)]}>
            {bookingUrl ? `Book a 20 minute review call with ${name}.` : `Ask ${name} about any number in this report.`}
          </Text>
        </View>
        {contactEmail || bookingUrl ? (
          <View style={{ alignItems: "flex-end", maxWidth: 230 }}>
            {contactEmail ? (
              <Link src={`mailto:${contactEmail}`} style={[linkStyle, lines(1)]}>
                {contactEmail}
              </Link>
            ) : null}
            {bookingUrl ? (
              <Link src={bookingUrl} style={[linkStyle, { color: COLORS.secondary, marginTop: 3 }, lines(1)]}>
                {bookingUrl.replace(/^https?:\/\//, "")}
              </Link>
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export function Method({ ctx }: { ctx: ReportCtx }) {
  const snap = ctx.snapshot;
  const terms = glossary(ctx);
  return (
    <Page size="LETTER" style={s.page}>
      <Header ctx={ctx} />
      <SectionHead ctx={ctx} section="method" headline="How we measured, and what each number means" />

      <SubHead style={{ marginTop: -4 }}>How we measured</SubHead>
      <Text style={[{ fontSize: 10.5, color: COLORS.secondary, lineHeight: 1.6, marginBottom: 16 }, lines(6)]}>
        {snap.method.text}
      </Text>

      <SubHead>Glossary</SubHead>
      <View style={[s.row, { flexWrap: "wrap", justifyContent: "space-between", marginBottom: 14 }]}>
        {terms.map(([term, text]) => (
          <View
            key={term}
            wrap={false}
            style={{ width: "48%", borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 8, paddingBottom: 10 }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: 600, marginBottom: 2 }}>{term}</Text>
            <Text style={[{ fontSize: 9.5, color: COLORS.secondary, lineHeight: 1.45 }, lines(3)]}>{text}</Text>
          </View>
        ))}
      </View>

      <Card style={{ paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13 }}>
        <Text style={{ fontSize: 10.5, fontWeight: 600, marginBottom: 4 }}>Limits of this report</Text>
        <Text style={{ fontSize: 9.75, color: COLORS.secondary, lineHeight: 1.5 }}>
          Answers in the {engineList(snap.coverage.engines)} apps can differ from API answers, and AI answers change from
          day to day. These numbers show direction, not a guaranteed placement. No one can promise AI recommendations.
        </Text>
      </Card>

      <Contact ctx={ctx} />
      <Footer ctx={ctx} />
    </Page>
  );
}
