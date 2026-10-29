import { Image, Page, Text, View } from "@react-pdf/renderer";
import type { ReportCtx } from "../context";
import { city, engineList, formatDate, initials, plural } from "../format";
import { SECTIONS } from "../layout";
import { BigNumber, Card } from "../primitives";
import { COLORS, lines, s } from "../theme";

function Logo({ ctx }: { ctx: ReportCtx }) {
  const box = { width: 35, height: 35, borderRadius: 6 };
  // react-pdf images take no alt text; the agency name sits right next to the logo.
  // eslint-disable-next-line jsx-a11y/alt-text
  if (ctx.logo) return <Image src={ctx.logo} style={{ ...box, objectFit: "contain" }} />;
  return (
    <View
      style={{ ...box, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ fontSize: 10, fontWeight: 700, color: COLORS.muted }}>{initials(ctx.snapshot.agency.name)}</Text>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "50%", paddingRight: 12, marginBottom: 15 }}>
      <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 2 }}>{label}</Text>
      <Text style={[{ fontSize: 11, fontWeight: 600 }, lines(1)]}>{value}</Text>
    </View>
  );
}

function Stat({ label, value, unit, problem }: { label: string; value: string; unit?: string; problem?: boolean }) {
  return (
    <Card style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
      <Text style={{ fontSize: 9, color: COLORS.secondary, marginBottom: 7 }}>{label}</Text>
      <BigNumber value={value} unit={unit} size={32} problem={problem} />
    </Card>
  );
}

export function Cover({ ctx }: { ctx: ReportCtx }) {
  const { snapshot: snap } = ctx;
  const place = city(snap.business.market);
  const subtitle = `How often ${engineList(snap.coverage.engines)} recommend you to ${
    place ? `people in ${place}` : "local customers"
  }, who they recommend instead, and what to fix first.`;
  const business = [snap.business.name, snap.business.domain].filter(Boolean).join(", ");
  const coverage = `${snap.coverage.questions} ${plural(snap.coverage.questions, "question")}, ${
    snap.coverage.engines.length
  } AI ${plural(snap.coverage.engines.length, "engine")}, ${snap.coverage.answers} ${plural(snap.coverage.answers, "answer")}`;
  const rank = snap.rank;
  // Long names step down so two lines still leave room for the contents list.
  const nameSize = snap.business.name.length <= 14 ? 58 : snap.business.name.length <= 20 ? 46 : 36;

  return (
    <Page size="LETTER" style={[s.page, s.coverPage]}>
      <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
        <View style={[s.row, { alignItems: "center" }]}>
          <Logo ctx={ctx} />
          <Text style={[{ fontSize: 11, fontWeight: 700, marginLeft: 9, maxWidth: 230 }, lines(2)]}>
            {snap.agency.name}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", paddingTop: 6 }}>
          <Text style={{ fontSize: 9, color: COLORS.secondary }}>Prepared {formatDate(snap.preparedAt)}</Text>
          <Text style={[{ fontSize: 9, color: COLORS.secondary, marginTop: 4, maxWidth: 220 }, lines(1)]}>
            Confidential, for {snap.business.name}
          </Text>
        </View>
      </View>

      <Text style={[s.sectionLabel, { color: ctx.accent, marginTop: 52, marginBottom: 10 }]}>AI VISIBILITY REPORT</Text>
      <Text style={[{ fontSize: nameSize, fontWeight: 700, letterSpacing: -nameSize / 32, lineHeight: 1.08 }, lines(2)]}>
        {snap.business.name}
      </Text>
      <Text style={[{ fontSize: 15, color: COLORS.secondary, lineHeight: 1.45, maxWidth: 345, marginTop: 14 }, lines(4)]}>
        {subtitle}
      </Text>

      <View style={[s.divider, { marginTop: 26, marginBottom: 20 }]} />
      <View style={[s.row, { flexWrap: "wrap" }]}>
        <Meta label="Business" value={business} />
        <Meta label="Market" value={snap.business.market ?? "Not set"} />
        <Meta label="Period" value={`${ctx.period} (${snap.period.days} days)`} />
        <Meta label="Coverage" value={coverage} />
      </View>

      <View style={[s.row, { gap: 13, marginTop: 6 }]}>
        <Stat label="Visibility score" value={String(snap.score.value)} unit="/100" problem={snap.score.value === 0} />
        <Stat
          label={rank ? `Rank among ${rank.of} tracked` : "Rank among tracked"}
          value={rank ? `#${rank.position}` : "None"}
        />
        <Stat label="Fixes in the action plan" value={String(snap.fixes.length)} />
      </View>

      <Text style={[s.caps, { marginTop: 28, marginBottom: 6, color: COLORS.secondary }]}>CONTENTS</Text>
      {SECTIONS.map((section, i) => (
        <View
          key={section.key}
          style={[
            s.row,
            { justifyContent: "space-between", paddingVertical: 5.5 },
            i < SECTIONS.length - 1 ? s.divider : {},
          ]}
        >
          <Text style={{ fontSize: 10.5 }}>{`${i + 1}. ${section.title}`}</Text>
          <Text style={{ fontSize: 10.5, color: COLORS.muted }}>{ctx.pages[section.key]}</Text>
        </View>
      ))}
    </Page>
  );
}
