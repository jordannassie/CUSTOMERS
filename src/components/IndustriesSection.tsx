export default function IndustriesSection() {
  const industries = [
    {
      title: "Personal Injury",
      subtitle: "We help put your firm in front of people searching for answers.",
      gradient: "bg-gradient-to-b from-[#1e3a5f] to-[#0F172A]",
    },
    {
      title: "Roofing",
      subtitle: "Reach homeowners who need estimates and repairs.",
      gradient: "bg-gradient-to-b from-[#374151] to-[#111827]",
    },
    {
      title: "Med Spa",
      subtitle: "Turn your treatments and offers into new conversations.",
      gradient: "bg-gradient-to-b from-[#6b21a8] to-[#3b0764]",
    },
    {
      title: "Real Estate",
      subtitle: "Get more buyers, sellers, and listing conversations.",
      gradient: "bg-gradient-to-b from-[#0369a1] to-[#0c4a6e]",
    },
  ];

  return (
    <section id="industries" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            Video ads made for your business.
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {industries.map((industry) => (
            <div
              key={industry.title}
              className={`${industry.gradient} rounded-2xl overflow-hidden shadow-lg`}
              style={{ aspectRatio: "9/16" }}
            >
              <div className="relative h-full flex flex-col">
                {/* Top badge */}
                <div className="p-4">
                  <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Video Ad</span>
                </div>

                {/* Play button center */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-sm">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Bottom text */}
                <div className="p-5 bg-gradient-to-t from-black/70 to-transparent">
                  <h3 className="text-white font-bold text-base mb-1">{industry.title}</h3>
                  <p className="text-white/70 text-xs leading-relaxed">{industry.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
