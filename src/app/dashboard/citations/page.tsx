import { redirect } from "next/navigation";
import Link from "next/link";
import { Quote, Globe, ExternalLink, Link2, FileText } from "lucide-react";
import BotIcon from "@/components/BotIcon";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { EmptyState } from "@/components/geo/dashboard/ui";
import { DomainFavicon } from "@/components/DomainFavicon";
import { PROVIDER_LABELS, classifyDomain } from "@/lib/geo/dashboard-aggregator";
import { getPrimaryBusiness, getLatestRunResults } from "@/lib/geo/dashboard-data";

export const metadata = { title: "Sources & Citations", robots: { index: false } };

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "You":           { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
  "Forum / UGC":   { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  "Editorial":     { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
  "Reference":     { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  "Directory":     { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  "Citation":      { bg: "#F5F5F2", text: "#555552", border: "#E5E5E1" },
};

function TypeBadge({ type }: { type: string }) {
  const style = TYPE_COLORS[type] ?? TYPE_COLORS["Citation"];
  return (
    <span
      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
      style={{ background: style.bg, color: style.text, borderColor: style.border }}
    >
      {type}
    </span>
  );
}

export default async function CitationsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const results = await getLatestRunResults(business.id);

  // ── Aggregate by domain ────────────────────────────────────────────────────
  const domainMap = new Map<string, {
    count: number;
    fullUrls: Set<string>;
    models: Set<string>;
    promptCount: number;
  }>();

  for (const r of results) {
    for (const source of r.cited_sources) {
      let domain = source.url;
      try { domain = new URL(source.url).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
      const entry = domainMap.get(domain) ?? { count: 0, fullUrls: new Set(), models: new Set(), promptCount: 0 };
      entry.count++;
      entry.fullUrls.add(source.url);
      entry.models.add(r.provider);
      domainMap.set(domain, entry);
    }
  }

  const ownDomain = business.domain ?? null;
  const sorted = Array.from(domainMap.entries())
    .sort((a, b) => b[1].count - a[1].count);

  const totalCitations = sorted.reduce((s, [, v]) => s + v.count, 0);
  const uniqueSources  = sorted.length;
  const ownDomainCitations = ownDomain
    ? sorted.filter(([d]) => d.includes(ownDomain)).reduce((s, [, v]) => s + v.count, 0)
    : 0;
  const citationRate = totalCitations > 0
    ? Math.round((ownDomainCitations / totalCitations) * 100)
    : 0;

  // Type breakdown
  const typeCountMap: Record<string, number> = {};
  for (const [domain, { count }] of sorted) {
    const t = classifyDomain(domain, ownDomain);
    typeCountMap[t] = (typeCountMap[t] ?? 0) + count;
  }
  const typeBreakdown = Object.entries(typeCountMap).sort((a, b) => b[1] - a[1]);

  // Your cited pages
  const ownPages: Array<{ path: string; fullUrl: string; count: number }> = [];
  if (ownDomain) {
    const pageMap = new Map<string, { path: string; count: number }>();
    for (const r of results) {
      for (const s of r.cited_sources) {
        if (!s.url.includes(ownDomain)) continue;
        let path = s.url;
        try { path = new URL(s.url).pathname || "/"; } catch { /* keep raw */ }
        const e = pageMap.get(s.url) ?? { path, count: 0 };
        e.count++;
        pageMap.set(s.url, e);
      }
    }
    ownPages.push(
      ...Array.from(pageMap.entries())
        .map(([fullUrl, { path, count }]) => ({ fullUrl, path, count }))
        .sort((a, b) => b.count - a.count),
    );
  }

  return (
    <DashboardShell
      businessId={business.id}
      businessName={business.name}
      businessLogoUrl={business.logo_url}
      businessDomain={business.domain}
    >
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-[#171717] mb-1">Citations &amp; Sources</h1>
          <p className="text-[13px] text-[#777773]">
            {totalCitations > 0
              ? `${totalCitations} citations · ${uniqueSources} unique sources · latest scan`
              : "Sources cited by AI when responding to your tracked prompts."}
          </p>
        </div>
        {/* Direct Agent */}
        {totalCitations > 0 && (
          <Link
            href={`/dashboard/direct-agent?q=${encodeURIComponent(
              "How can I get cited by more high-quality sources in AI responses?",
            )}`}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#777773] bg-white border border-[#E5E5E1] rounded-lg px-3 py-2 hover:bg-[#F5F5F2] hover:border-[#D4D4CF] hover:text-[#171717] transition-colors"
          >
            <BotIcon size={14} aria-hidden="true" />
            Ask Direct Agent
          </Link>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="No citations yet"
          body="Citations appear here after a completed visibility scan, if the AI provider's response included source URLs."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* ── KPI row ────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total Citations",
                value: `${totalCitations}`,
                sub: "across all AI models",
                icon: Quote,
              },
              {
                label: "Unique Sources",
                value: `${uniqueSources}`,
                sub: "distinct domains cited",
                icon: Link2,
              },
              {
                label: "Your Pages Cited",
                value: `${ownDomainCitations}`,
                sub: ownDomain ? `from ${ownDomain}` : "set your domain in settings",
                icon: Globe,
              },
              {
                label: "Own Citation Rate",
                value: `${citationRate}%`,
                sub: "your pages vs total citations",
                icon: FileText,
              },
            ].map(({ label, value, sub, icon: Icon }) => (
              <div key={label} className="bg-white rounded-xl border border-[#E5E5E1] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider">
                    {label}
                  </p>
                  <Icon size={13} className="text-[#D4D4CF]" aria-hidden="true" />
                </div>
                <p className="text-[22px] font-bold text-[#171717] leading-none">{value}</p>
                <p className="text-[11px] text-[#A3A3A0] mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* ── Type breakdown bar ──────────────────────────────────────────── */}
          {typeBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E5E1] p-5">
              <p className="text-[13px] font-bold text-[#171717] mb-3">Source breakdown</p>
              {/* Stacked bar */}
              <div className="flex h-2.5 rounded-full overflow-hidden mb-4 gap-px">
                {typeBreakdown.map(([type, count]) => {
                  const pct = totalCitations > 0 ? (count / totalCitations) * 100 : 0;
                  const style = TYPE_COLORS[type] ?? TYPE_COLORS["Citation"];
                  return (
                    <div
                      key={type}
                      style={{ width: `${pct}%`, background: style.text, opacity: 0.75 }}
                      title={`${type}: ${Math.round(pct)}%`}
                    />
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {typeBreakdown.map(([type, count]) => {
                  const pct = totalCitations > 0 ? Math.round((count / totalCitations) * 100) : 0;
                  const style = TYPE_COLORS[type] ?? TYPE_COLORS["Citation"];
                  return (
                    <div key={type} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ background: style.text, opacity: 0.75 }}
                      />
                      <span className="text-[11.5px] text-[#777773]">
                        {type}
                        <span className="ml-1.5 font-bold text-[#171717]">{pct}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Citation source table ───────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EEEEEA] flex items-center gap-3">
              <h2 className="text-[13px] font-bold text-[#171717]">Source table</h2>
              <span className="text-[11px] text-[#A3A3A0]">
                {uniqueSources} domain{uniqueSources !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Table header */}
            <div
              className="grid items-center px-5 py-2.5 border-b border-[#EEEEEA] bg-[#FAFAF8]"
              style={{ gridTemplateColumns: "28px 1fr 110px 70px 80px 80px" }}
            >
              {["#", "Domain", "Type", "Cit.", "Share", "Models"].map((h) => (
                <span key={h} className="text-[9.5px] font-semibold text-[#A3A3A0] uppercase tracking-wider">
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#EEEEEA]">
              {sorted.map(([domain, { count, fullUrls, models }], i) => {
                const type = classifyDomain(domain, ownDomain);
                const pct  = totalCitations > 0 ? Math.round((count / totalCitations) * 100) : 0;
                const isYou = type === "You";
                return (
                  <div
                    key={domain}
                    className={`grid items-center px-5 py-3 hover:bg-[#F5F5F2] transition-colors ${
                      isYou ? "bg-[#F0FDF4]/40" : ""
                    }`}
                    style={{ gridTemplateColumns: "28px 1fr 110px 70px 80px 80px" }}
                  >
                    <span className="text-[12px] text-[#A3A3A0] tabular-nums">{i + 1}</span>

                    <span className="flex items-center gap-2 min-w-0">
                      <DomainFavicon domain={domain} size={14} />
                      <a
                        href={Array.from(fullUrls)[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-[12.5px] truncate hover:underline underline-offset-2 inline-flex items-center gap-1 ${
                          isYou ? "font-semibold text-[#166534]" : "text-[#171717]"
                        }`}
                      >
                        {domain}
                        <ExternalLink size={10} className="shrink-0 text-[#D4D4CF]" />
                      </a>
                    </span>

                    <TypeBadge type={type} />

                    <span className="text-[12px] font-semibold text-[#171717] tabular-nums">
                      {count}×
                    </span>

                    {/* Share bar */}
                    <span className="flex items-center gap-2 pr-2">
                      <span className="text-[11px] text-[#777773] tabular-nums w-7">{pct}%</span>
                      <div className="flex-1 h-1.5 bg-[#F0F0EC] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#3B82F6]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </span>

                    {/* Models */}
                    <span className="text-[10.5px] text-[#A3A3A0] truncate">
                      {Array.from(models)
                        .map((m) => {
                          const l = PROVIDER_LABELS[m] ?? m;
                          return l.split(" ")[0]; // "ChatGPT" → "ChatGPT"
                        })
                        .join(", ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Your cited pages ────────────────────────────────────────────── */}
          {ownDomain && (
            <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#EEEEEA] flex items-center justify-between">
                <div>
                  <h2 className="text-[13px] font-bold text-[#171717]">Your cited pages</h2>
                  <p className="text-[11px] text-[#A3A3A0] mt-0.5">
                    Pages from <strong className="font-semibold text-[#777773]">{ownDomain}</strong> cited by AI
                  </p>
                </div>
                {ownPages.length > 0 && (
                  <Link
                    href={`/dashboard/direct-agent?q=${encodeURIComponent(
                      "How can I get more of my pages cited by AI? Which pages should I optimise first?",
                    )}`}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#777773] hover:text-[#171717] transition-colors"
                  >
                    <BotIcon size={13} aria-hidden="true" />
                    How to improve
                  </Link>
                )}
              </div>

              {ownPages.length === 0 ? (
                <div className="px-5 py-5 text-[13px] text-[#A3A3A0]">
                  None of your pages were cited in the latest scan.
                </div>
              ) : (
                <div className="divide-y divide-[#EEEEEA]">
                  {ownPages.map((page) => (
                    <div
                      key={page.fullUrl}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[#F5F5F2] transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Globe size={13} className="text-[#A3A3A0] shrink-0" />
                        <a
                          href={page.fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] text-[#171717] font-medium hover:underline underline-offset-2 truncate"
                        >
                          {page.path}
                        </a>
                      </span>
                      <span className="text-[12px] font-bold text-[#3B82F6] tabular-nums shrink-0 ml-4">
                        {page.count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-[#A3A3A0] mt-5 max-w-2xl">
        Source types are estimated from known domain patterns. Citations reflect the latest completed visibility scan.
        Your own domain is highlighted when it matches your registered business domain.
      </p>
    </DashboardShell>
  );
}
