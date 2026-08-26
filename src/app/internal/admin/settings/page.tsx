import { requireAdmin } from "@/lib/admin/require";
import { PRODUCT_ACCESS } from "@/config/product-access";

function ConfigRow({
  label,
  configured,
  note,
}: {
  label: string;
  configured: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <div>
        <p className="text-[13px] text-white/80">{label}</p>
        {note && <p className="text-[11px] text-white/30 mt-0.5">{note}</p>}
      </div>
      <span
        className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
          configured
            ? "bg-emerald-900/40 text-emerald-400"
            : "bg-red-900/30 text-red-400"
        }`}
      >
        {configured ? "✓ Configured" : "Missing"}
      </span>
    </div>
  );
}

function FlagRow({ label, value, note }: { label: string; value: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <div>
        <p className="text-[13px] text-white/80">{label}</p>
        {note && <p className="text-[11px] text-white/30 mt-0.5">{note}</p>}
      </div>
      <span
        className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
          value
            ? "bg-[#0866F5]/20 text-[#60A5FA]"
            : "bg-white/5 text-white/30"
        }`}
      >
        {value ? "ON" : "OFF"}
      </span>
    </div>
  );
}

export default async function AdminSettingsPage() {
  await requireAdmin();

  // Detect configured env vars (present = non-empty, but never expose values)
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
    adminPin:            !!process.env.ADMIN_PIN,
    adminSessionSecret:  !!process.env.ADMIN_SESSION_SECRET,
    siteUrl:             !!process.env.NEXT_PUBLIC_SITE_URL,
    googleOAuthInSupa:   true, // managed in Supabase dashboard — not an env var
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-[22px] font-bold text-white mb-2">Settings</h1>
      <p className="text-[12px] text-white/30 mb-8">Read-only configuration snapshot. Manage values in Netlify/Supabase dashboard.</p>

      {/* Product access flags */}
      <div className="bg-[#1E293B] border border-white/8 rounded-xl p-5 mb-6">
        <h2 className="text-[13px] font-bold text-white mb-1">Product Access</h2>
        <p className="text-[11px] text-white/30 mb-4">From <code className="bg-white/5 px-1 rounded">src/config/product-access.ts</code></p>
        <FlagRow label="Beta Free Access"  value={PRODUCT_ACCESS.betaFreeAccess}  note="All authenticated users have full access (no trial/payment gates)" />
        <FlagRow label="Billing Enabled"   value={PRODUCT_ACCESS.billingEnabled}  note="Stripe checkout / subscription enforcement" />
        <FlagRow label="Trial Enabled"     value={PRODUCT_ACCESS.trialEnabled}    note="Trial countdown and expiration gating" />
      </div>

      {/* Infrastructure */}
      <div className="bg-[#1E293B] border border-white/8 rounded-xl p-5 mb-6">
        <h2 className="text-[13px] font-bold text-white mb-4">Infrastructure</h2>
        <ConfigRow label="Supabase URL"          configured={env.supabaseUrl}         note="NEXT_PUBLIC_SUPABASE_URL" />
        <ConfigRow label="Supabase Anon Key"     configured={env.supabaseAnon}        note="NEXT_PUBLIC_SUPABASE_ANON_KEY" />
        <ConfigRow label="Supabase Service Role" configured={env.supabaseServiceRole} note="SUPABASE_SERVICE_ROLE_KEY" />
        <ConfigRow label="Site URL"              configured={env.siteUrl}             note="NEXT_PUBLIC_SITE_URL" />
        <ConfigRow label="Admin PIN"             configured={env.adminPin}            note="ADMIN_PIN" />
        <ConfigRow label="Admin Session Secret"  configured={env.adminSessionSecret}  note="ADMIN_SESSION_SECRET" />
      </div>

      {/* AI Providers */}
      <div className="bg-[#1E293B] border border-white/8 rounded-xl p-5 mb-6">
        <h2 className="text-[13px] font-bold text-white mb-4">AI Providers</h2>
        <ConfigRow label="OpenAI / ChatGPT" configured={env.openai}    note="OPENAI_API_KEY" />
        <ConfigRow label="Anthropic / Claude" configured={env.anthropic} note="ANTHROPIC_API_KEY" />
        <ConfigRow label="Perplexity"       configured={env.perplexity} note="PERPLEXITY_API_KEY" />
        <ConfigRow label="Google Gemini"    configured={env.gemini}    note="GEMINI_API_KEY" />
        <ConfigRow label="Google OAuth"     configured={env.googleOAuthInSupa} note="Configured in Supabase dashboard" />
      </div>

      {/* Data providers */}
      <div className="bg-[#1E293B] border border-white/8 rounded-xl p-5">
        <h2 className="text-[13px] font-bold text-white mb-4">Data Providers</h2>
        <ConfigRow label="DataForSEO"     configured={env.dataForSeo}    note="DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD" />
        <ConfigRow label="Google Places"  configured={env.googlePlaces}  note="GOOGLE_PLACES_API_KEY" />
      </div>
    </div>
  );
}
