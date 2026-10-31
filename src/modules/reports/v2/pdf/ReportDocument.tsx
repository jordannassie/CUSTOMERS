import { Document } from "@react-pdf/renderer";
import type { ReportCtx } from "./context";
import { Behind } from "./pages/Behind";
import { Cover } from "./pages/Cover";
import { Knows } from "./pages/Knows";
import { Method } from "./pages/Method";
import { Plan } from "./pages/Plan";
import { Summary } from "./pages/Summary";
import { FixPages, Roadmap } from "./pages/Roadmap";

/** The 10-page AI visibility report (docs/report-reference.pdf); fewer fixes give fewer fix pages. */
export function ReportDocument({ ctx }: { ctx: ReportCtx }) {
  const snap = ctx.snapshot;
  return (
    <Document
      title={`${snap.business.name} AI visibility report, ${ctx.period}`}
      author={snap.agency.name}
      subject="AI visibility report"
      creator={snap.agency.name}
      producer={snap.agency.name}
      language="en-US"
    >
      <Cover ctx={ctx} />
      <Summary ctx={ctx} />
      <Knows ctx={ctx} />
      <Behind ctx={ctx} />
      <Plan ctx={ctx} />
      <FixPages ctx={ctx} />
      <Roadmap ctx={ctx} />
      <Method ctx={ctx} />
    </Document>
  );
}
