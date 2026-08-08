"use client";

export default function HeroSection() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="bg-white pt-8 pb-20 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left — Text */}
        <div className="flex flex-col gap-6">
          {/* Eyebrow */}
          <span className="text-xs font-semibold tracking-widest text-[#2563EB] uppercase">
            Customer Acquisition, Done For You
          </span>

          {/* H1 */}
          <h1 className="text-4xl md:text-5xl font-black text-[#0F172A] leading-tight">
            We drive new customers directly to your DMs.
          </h1>

          {/* Body */}
          <p className="text-lg text-[#64748B] leading-relaxed">
            We create and run targeted video ads that start conversations with
            people interested in your services.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => scrollTo("strategy-call")}
              className="inline-flex items-center justify-center bg-[#2563EB] text-white font-bold px-8 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base"
            >
              Book a Strategy Call
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="inline-flex items-center justify-center border-2 border-[#2563EB] text-[#2563EB] font-bold px-8 py-4 rounded-full hover:bg-[#EFF6FF] transition-colors text-base"
            >
              See How It Works
            </button>
          </div>

          {/* Benefit Pills */}
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="bg-[#EFF6FF] text-[#0F172A] text-sm font-medium px-4 py-2 rounded-full">
              📍 Targeted video ads
            </span>
            <span className="bg-[#EFF6FF] text-[#0F172A] text-sm font-medium px-4 py-2 rounded-full">
              💬 More conversations in your DMs
            </span>
            <span className="bg-[#EFF6FF] text-[#0F172A] text-sm font-medium px-4 py-2 rounded-full">
              👥 Real people interested in you
            </span>
          </div>
        </div>

        {/* Right — Visual Collage */}
        <div className="relative h-[520px] hidden lg:block">
          {/* Video Ad Card */}
          <div className="absolute top-0 left-0 w-[160px] h-[280px] bg-[#0F172A] rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between p-4 z-10">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-white text-[10px] font-semibold opacity-70">Video Ad</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="bg-gradient-to-t from-black/80 to-transparent rounded-lg p-2 w-full">
                <p className="text-white text-[9px] font-semibold leading-tight">Personal Injury</p>
                <p className="text-white/70 text-[8px] leading-tight mt-0.5">We fight for what you deserve.</p>
              </div>
            </div>
          </div>

          {/* Meta Campaign Card */}
          <div className="absolute top-6 left-[130px] w-[220px] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-[#2563EB] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-[#0F172A]">Meta Campaign</span>
            </div>
            <div className="text-[10px] text-[#64748B] mb-1 font-medium">Personal Injury — Local Reach</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-[#EFF6FF] rounded-lg p-2">
                <div className="text-[10px] text-[#64748B]">Reach</div>
                <div className="text-sm font-black text-[#2563EB]">18.4K</div>
              </div>
              <div className="bg-[#F5F3FF] rounded-lg p-2">
                <div className="text-[10px] text-[#64748B]">Messages</div>
                <div className="text-sm font-black text-[#7C3AED]">47</div>
              </div>
            </div>
            <div className="mt-2 bg-gray-50 rounded-lg px-2 py-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[9px] text-[#64748B] font-medium">Active · Campaign running</span>
            </div>
          </div>

          {/* Messages Card */}
          <div className="absolute bottom-0 right-0 w-[230px] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#0F172A]">Messages</span>
              <span className="text-[10px] text-[#2563EB] font-semibold bg-[#DBEAFE] px-2 py-0.5 rounded-full">3 new</span>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { name: "Sarah M.", msg: "I'm interested, can I get more info?" },
                { name: "James T.", msg: "Do you offer free consultations?" },
                { name: "Diana R.", msg: "Can I get a quote?" },
              ].map((item) => (
                <div key={item.name} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#DBEAFE] flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-[#2563EB]">{item.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-[#0F172A]">{item.name}</div>
                    <div className="text-[9px] text-[#64748B] truncate">{item.msg}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile visual placeholder */}
        <div className="lg:hidden w-full flex justify-center">
          <div className="bg-[#EFF6FF] rounded-2xl p-8 flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="w-16 h-16 bg-[#2563EB] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#0F172A] text-center">Video ads → DM conversations → New customers</p>
          </div>
        </div>
      </div>
    </section>
  );
}
