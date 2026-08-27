import { requireAdmin } from "@/lib/admin/require";
import { PRODUCT_ACCESS } from "@/config/product-access";

function ConfigRow({ label, configured, note }: { label: string; configured: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F8FAFD] last:border-0">
      <div>
        <p className="text-[13px] text-[#374151] font-medium">{label}</p>
        {note && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{note}</p>}
      </div>
      <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
        configured
          ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
          : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
      }`}>
        {configured ? "✓ Configured" : "Missing"}
      </span>
    </div>
  );
}

function FlagRow({ label, value, note }: { label: string; value: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F8FAFD] last:border-0">
      <div>
        <p className="text-[13px] text-[#374151] font-medium">{label}</p>
        {note && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{note}</p>}
      </div>
      <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
        value
          ? "bg-[#EFF6FF] text-[#0866F5] border border-[#BFDBFE]"
          : "bg-[#F8FAFD] text-[#9CA3AF] border border-[#E2E8F0]"
      }`}>
        {value ? "ON" : "OFF"}
      </span>
    </div>
  );
}

export default async function AdminSettingsPage() {
  await requireAdmin();

  const env = {
    supabaseUrl:         !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnon:        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    openai:              !!process.env.OPENAI_API_KEY,
    anthropic:           !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY),
    perplexity:          !!process.env.PERPLEXITY_API_KEY,
    gemini:              !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
    dataForSeo:          !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
    googlePlaces:        !!process.env.GOOGLE_PLACES_API_KEY,
    siteUrl:             !!process.env.NEXT_PUBLIC_SITE_URL,
    googleOAuthInSupa:   true,
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111827]">Settings</h1>
        <p className="text-[12px] text-[#9CA3AF] mt-1">Read-only configuration snapshot. Manage values in Netlify/Supabase dashboard.</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Product access flags */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h2 className="text-[13px] font-bold text-[#111827] mb-0.5">Product Access</h2>
          <p className="text-[11px] text-[#9CA3AF] mb-4">
            From <code className="bg-[#F8FAFD] border border-[#E2E8F0] px-1.5 py-0.5 rounded text-[10px]">src/config/product-access.ts</code>
          </p>
          <FlagRow label="Beta Free Access" value={PRODUCT_ACCESS.betaFreeAccess} note="All authenticated users have full access (no trial/payment gates)" />
          <FlagRow label="Billing Enabled"  value={PRODUCT_ACCESS.billingEnabled} note="Stripe checkout / subscription enforcement" />
          <FlagRow label="Trial Enabled"    value={PRODUCT_ACCESS.trialEnabled}   note="Trial countdown and expiration gating" />
        </div>

        {/* Infrastructure */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h2 className="text-[13px] font-bold text-[#111827] mb-4">Infrastructure</h2>
          <ConfigRow label="Supabase URL"          configured={env.supabaseUrl}         note="NEXT_PUBLIC_SUPABASE_URL" />
          <ConfigRow label="Supabase Anon Key"     configured={env.supabaseAnon}        note="NEXT_PUBLIC_SUPABASE_ANON_KEY" />
          <ConfigRow label="Supabase Service Role" configured={env.supabaseServiceRole} note="SUPABASE_SERVICE_ROLE_KEY" />
          <ConfigRow label="Site URL"              configured={env.siteUrl}             note="NEXT_PUBLIC_SITE_URL" />
        </div>

        {/* AI Providers */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h2 className="text-[13px] font-bold text-[#111827] mb-4">AI Providers</h2>
          <ConfigRow label="OpenAI / ChatGPT"    configured={env.openai}           note="OPENAI_API_KEY" />
          <ConfigRow label="Anthropic / Claude"  configured={env.anthropic}        note="ANTHROPIC_API_KEY" />
          <ConfigRow label="Perplexity"          configured={env.perplexity}       note="PERPLEXITY_API_KEY" />
          <ConfigRow label="Google Gemini"       configured={env.gemini}           note="GEMINI_API_KEY" />
          <ConfigRow label="Google OAuth"        configured={env.googleOAuthInSupa} note="Configured in Supabase dashboard" />
        </div>

        {/* Data providers */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h2 className="text-[13px] font-bold text-[#111827] mb-4">Data Providers</h2>
          <ConfigRow label="DataForSEO"    configured={env.dataForSeo}    note="DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD" />
          <ConfigRow label="Google Places" configured={env.googlePlaces}  note="GOOGLE_PLACES_API_KEY" />
        </div>
      </div>
    </div>
  );
}
