import { Text, View } from "@react-pdf/renderer";
import type { ReportCtx } from "./context";
import { lines, s } from "./theme";

/** Business name left, report name and period right. Fix pages add "Action plan, continued". */
export function Header({ ctx, continued = false }: { ctx: ReportCtx; continued?: boolean }) {
  return (
    <View fixed style={s.header}>
      <Text style={[{ maxWidth: 260 }, lines(1)]}>
        <Text style={s.semibold}>{ctx.snapshot.business.name}</Text>
        {continued ? <Text style={s.muted}> · Action plan, continued</Text> : null}
      </Text>
      <Text style={s.muted}>AI visibility report · {ctx.period}</Text>
    </View>
  );
}

/** "Prepared by <agency>" left and "Page X of Y" right. */
export function Footer({ ctx }: { ctx: ReportCtx }) {
  return (
    <View fixed style={s.footer}>
      <Text style={[{ maxWidth: 360 }, lines(1)]}>Prepared by {ctx.snapshot.agency.name}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}
