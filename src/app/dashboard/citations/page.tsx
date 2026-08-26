import { redirect } from "next/navigation";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { EmptyState } from "@/components/geo/dashboard/ui";
import { SourceTypeBadge } from "@/components/SourceTypeBadge";
import { DomainFavicon } from "@/components/DomainFavicon";
import { getPrimaryBusiness, getLatestRunResults } from "@/lib/geo/dashboard-data";

export const metadata = { title: "Citations", robots: { index: false } };

/** Best-guess source type from a domain */
function guessType(domain: string, ownDomain: string | null): string {
  if (ownDomain && domain.includes(ownDomain)) return "You";
  const ugc = ["reddit.com", "quora.com", "yelp.com", "tripadvisor.com", "trustpilot.com", "g2.com", "capterra.com", "producthunt.com", "twitter.com", "x.com", "facebook.com", "instagram.com"];
  const ref  = ["wikipedia.org", "wikihow.com", "britannica.com", "crunchbase.com", "bloomberg.com", "sec.gov", "gov"];
  const edit = ["techcrunch.com", "forbes.com", "inc.com", "wired.com", "verge.com", "zdnet.com", "cnet.com", "pcmag.com", "techradar.com", "gartner.com", "mckinsey.com", "hbr.org"];
  if (ugc.some(u => domain.includes(u))) return "UGC";
  if (ref.some(r => domain.includes(r))) return "Reference";
  if (edit.some(e => domain.includes(e))) return "Editorial";
  return "Citation";
}

export default async function CitationsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const results = await getLatestRunResults(business.id);

  // Aggregate by domain
  const domainCounts = new Map<string, { count: number; fullUrls: string[] }>();
  for (const r of results) {
    for (const source of r.cited_sources) {
      let domain = source.url;
      try { domain = new URL(source.url).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
      const existing = domainCounts.get(domain) ?? { count: 0, fullUrls: [] };
      existing.count += 1;
      if (!existing.fullUrls.includes(source.url)) existing.fullUrls.push(source.url);
      domainCounts.set(domain, existing);
    }
  }

  const sorted = Array.from(domainCounts.entries())
    .sort((a, b) => b[1].count - a[1].count);

  const total = sorted.reduce((s, [, v]) => s + v.count, 0);
  const ownDomainCount = sorted.filter(([d]) =>
    business.domain && d.includes(business.domain)
  ).length;

  return (
    <DashboardShell businessId={business.id} businessName={business.name} businessLogoUrl={business.logo_url} businessDomain={business.domain}>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-[#171717] mb-1">Citations & Sources</h1>
          <p className="text-[13px] text-[#777773]">
            {sorted.length > 0
              ? `${sorted.length} domains cited across your latest scan · ${total} total citations${ownDomainCount > 0 ? ` · Your site cited ${ownDomainCount}×` : ""}`
              : "Sources cited by AI in responses to your tracked prompts."}
          </p>
        </div>
        {sorted.length > 0 && (
          <div className="flex items-center gap-3 text-[12px] text-[#777773] flex-wrap">
            {[
              { label: "UGC",       bg: "#EFF6FF", text: "#1D4ED8" },
              { label: "Editorial", bg: "#FFF7ED", text: "#C2410C" },
              { label: "Reference", bg: "#F5F3FF", text: "#6D28D9" },
              { label: "You",       bg: "#F0FDF4", text: "#15803D" },
            ].map(({ label, bg, text }) => (
              <span key={label} className="inline-flex items-center gap-1">
                <span className="inline-block text-[10px] font-semibold px-1.5 py-px rounded-full"
                  style={{ background: bg, color: text }}>{label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="No citations yet"
          body="Citations appear here after a completed visibility scan, if the AI provider's response included source URLs."
        />
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
          {/* Table header */}
          <div className="grid items-center px-5 py-2.5 border-b border-[#EEEEEA] bg-[#FAFAF8]"
            style={{ gridTemplateColumns: "28px 1fr 100px 60px 80px" }}>
            {["#", "Domain", "Type", "Citations", "Share"].map(h => (
              <span key={h} className="text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {/* Rows */}
          <div className="divide-y divide-[#EEEEEA]">
            {sorted.map(([domain, { count }], i) => {
              const type = guessType(domain, business.domain ?? null);
              const pct  = total > 0 ? Math.round((count / total) * 100) : 0;
              const isYou = type === "You";
              return (
                <div
                  key={domain}
                  className={`grid items-center px-5 py-3 hover:bg-[#F5F5F2] transition-colors ${isYou ? "bg-[#F0FDF4]/40" : ""}`}
                  style={{ gridTemplateColumns: "28px 1fr 100px 60px 80px" }}
                >
                  <span className="text-[12px] text-[#A3A3A0] tabular-nums">{i + 1}</span>

                  {/* Domain + favicon */}
                  <span className="flex items-center gap-2 min-w-0">
                    <DomainFavicon domain={domain} size={14} />
                    <span className={`text-[13px] truncate ${isYou ? "font-semibold text-[#15803D]" : "text-[#171717]"}`}>
                      {domain}
                    </span>
                  </span>

                  <SourceTypeBadge type={type} />

                  <span className="text-[13px] font-semibold text-[#171717] tabular-nums">{count}×</span>

                  {/* Share bar */}
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-[#777773] tabular-nums w-7">{pct}%</span>
                    <div className="flex-1 h-1.5 bg-[#F0F0EC] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#171717]" style={{ width: `${pct}%` }} />
                    </div>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[11px] text-[#A3A3A0] mt-5 max-w-2xl">
        Source types are automatically estimated from the domain. They may not be perfectly accurate.
        Your own domain is marked with the "You" badge when it matches your registered business domain.
      </p>
    </DashboardShell>
  );
}
