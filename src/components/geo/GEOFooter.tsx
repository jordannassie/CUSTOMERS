import Link from "next/link";

const year = new Date().getFullYear();

export default function GEOFooter() {
  return (
    <footer className="bg-[#0F172A] text-white px-4 pt-16 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="lg:col-span-2">
            <Link href="/ai-search" className="inline-block mb-4">
              <span className="text-white font-black text-[22px] tracking-tight">
                Customers.Direct
              </span>
            </Link>
            <p className="text-sm text-white/50 leading-relaxed max-w-sm">
              Customers.Direct helps AI send customers directly to your business —
              measuring and improving how often you show up in ChatGPT, Claude,
              Perplexity, and Google AI Overviews.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-xs text-white/50 uppercase tracking-widest mb-4">
              Product
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link href="/ai-search#how-it-works" className="text-sm text-white/50 hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/ai-search#pricing" className="text-sm text-white/50 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/signup" className="text-sm text-white/50 hover:text-white transition-colors">Check My AI Visibility</Link></li>
              <li><Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">Log in</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs text-white/50 uppercase tracking-widest mb-4">
              Company
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link href="/ai-employee" className="text-sm text-white/50 hover:text-white transition-colors">AI Employee</Link></li>
              <li><Link href="/dm-ads" className="text-sm text-white/50 hover:text-white transition-colors">DM Ads</Link></li>
              <li><Link href="/privacy" className="text-sm text-white/50 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-white/50 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <hr className="border-white/10 mb-6" />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-white/40">
            © {year} Customers.Direct. All rights reserved.
          </p>
          <p className="text-xs text-white/30 max-w-md text-right">
            Customers.Direct reports how AI assistants respond to real prompts. We do not
            guarantee rankings, mentions, or placement in any AI product — ever.
          </p>
        </div>
      </div>
    </footer>
  );
}
