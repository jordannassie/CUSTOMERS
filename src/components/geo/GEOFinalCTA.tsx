import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function GEOFinalCTA() {
  return (
    <section className="bg-white pb-20 sm:pb-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1e1b4b] px-8 py-14 sm:px-16 sm:py-16 text-center relative overflow-hidden"
        >
          <div
            className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #7C3AED, transparent 70%)" }}
            aria-hidden="true"
          />
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4 relative">
            See how AI talks about your business today.
          </h2>
          <p className="text-white/60 max-w-xl mx-auto mb-8 relative">
            Free first scan. No credit card required. Two minutes to get started.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-[#171717] font-bold px-8 py-4 rounded-full hover:bg-gray-100 transition-colors text-base relative"
          >
            Check My AI Visibility
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
