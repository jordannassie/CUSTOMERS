import { redirect } from "next/navigation";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";
import { createClient } from "@/lib/supabase/server";
import SeoDashboard from "@/components/geo/dashboard/SeoDashboard";
import type { Metadata } from "next";
import type { SeoSnapshot } from "@/lib/seo/types";

export const metadata: Metadata = {
  title: "SEO Intelligence",
  robots: { index: false },
};

export default async function SeoPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  // Load cached SEO snapshot (may be null if never fetched)
  const supabase = await createClient();
  const { data: rawSnapshot } = await supabase
    .from("seo_snapshots")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle();

  // Check current subscription for plan gating
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("business_id", business.id)
    .maybeSingle();

  const hasSeoAccess =
    subscription?.status === "active" &&
    (subscription?.plan === "growth_agent" || subscription?.plan === "autonomous_growth");

  let initialSnapshot: SeoSnapshot | null = null;
  if (rawSnapshot) {
    initialSnapshot = {
      businessId: business.id,
      domain: rawSnapshot.domain as string,
      overview: (rawSnapshot.overview as SeoSnapshot["overview"]) ?? {},
      topKeywords: (rawSnapshot.top_keywords as SeoSnapshot["topKeywords"]) ?? [],
      competitors: (rawSnapshot.competitors as SeoSnapshot["competitors"]) ?? [],
      backlinks: (rawSnapshot.backlinks as SeoSnapshot["backlinks"]) ?? {},
      keywordGaps: (rawSnapshot.keyword_gaps as SeoSnapshot["keywordGaps"]) ?? [],
      fetchedAt: rawSnapshot.fetched_at as string,
    };
  }

  return (
    <DashboardShell
      businessId={business.id}
      businessName={business.name}
      businessLogoUrl={business.logo_url}
      businessDomain={business.domain}
    >
      <SeoDashboard
        businessId={business.id}
        businessName={business.name}
        domain={business.domain}
        initialSnapshot={initialSnapshot}
        hasSeoAccess={hasSeoAccess}
      />
    </DashboardShell>
  );
}
