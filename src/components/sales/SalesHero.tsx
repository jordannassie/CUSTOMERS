import { ArrowRight, LayoutDashboard } from "lucide-react";

export default function SalesHero() {
  return (
    <section className="bg-white pt-14 pb-24 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-6">
          Customers Direct Sales
        </span>

        <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black text-[#0F172A] leading-[1.05] tracking-tight max-w-3xl mx-auto mb-6">
          Sell Something Every Business Understands.
        </h1>

        <p className="text-xl text-[#64748B] max-w-xl mx-auto leading-relaxed mb-10">
          Help businesses stop losing customers to missed calls by introducing them
          to Customers Direct AI Receptionist.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#apply"
            className="inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold px-8 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            Apply to Sales Program
            <ArrowRight size={17} aria-hidden="true" />
          </a>
          <a
            href="/sales/dashboard"
            className="inline-flex items-center justify-center gap-2 border border-gray-200 text-[#0F172A] font-semibold px-8 py-4 rounded-full hover:bg-gray-50 transition-colors text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            <LayoutDashboard size={17} aria-hidden="true" />
            Preview Sales Dashboard
          </a>
        </div>
      </div>
    </section>
  );
}
