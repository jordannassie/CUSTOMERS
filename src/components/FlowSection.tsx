export default function FlowSection() {
  return (
    <section className="gradient-bg py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            Built to drive real conversations.
          </h2>
        </div>

        {/* Flow */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
          {/* Step 1: Video Ad Creative */}
          <div className="bg-[#0F172A] rounded-2xl p-6 flex flex-col items-center gap-3 w-full md:w-56 shadow-lg">
            <div className="w-12 h-12 bg-white/15 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-sm">Video Ad Creative</div>
              <div className="text-white/60 text-xs mt-1">Custom-made for your business</div>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-[#7C3AED] font-black text-3xl rotate-90 md:rotate-0">→</div>

          {/* Step 2: Targeted Meta Campaign */}
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 w-full md:w-56 shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-[#EFF6FF] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-[#0F172A] font-bold text-sm">Targeted Meta Campaign</div>
              <div className="text-[#64748B] text-xs mt-1">Put in front of the right people</div>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-[#7C3AED] font-black text-3xl rotate-90 md:rotate-0">→</div>

          {/* Step 3: Incoming Customer DM */}
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 w-full md:w-56 shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-[#F5F3FF] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-[#0F172A] font-bold text-sm">Incoming Customer DM</div>
              <div className="text-[#64748B] text-xs mt-1">Direct messages to your inbox</div>
            </div>
          </div>
        </div>

        {/* Benefit Pills */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            "🎬 Custom video ads",
            "🎯 Targeted campaigns",
            "📨 Direct-to-DM leads",
            "✅ Done for you",
          ].map((pill) => (
            <span
              key={pill}
              className="bg-white text-[#0F172A] text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm border border-gray-100"
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
