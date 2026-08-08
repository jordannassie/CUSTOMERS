const VIDEO_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/Video/Girl%20ugc.mp4";

const industries = [
  {
    title: "Personal Injury",
    subtitle: "We help put your firm in front of people searching for answers.",
  },
  {
    title: "Roofing",
    subtitle: "Reach homeowners who need estimates and repairs.",
  },
  {
    title: "Med Spa",
    subtitle: "Turn your treatments and offers into new conversations.",
  },
  {
    title: "Real Estate",
    subtitle: "Get more buyers, sellers, and listing conversations.",
  },
];

export default function IndustriesSection() {
  return (
    <section id="industries" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            Video ads made for your business.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {industries.map((industry) => (
            <div
              key={industry.title}
              className="relative rounded-2xl overflow-hidden shadow-lg group"
              style={{ aspectRatio: "9/16" }}
            >
              {/* Real video background */}
              <video
                src={VIDEO_URL}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

              {/* Top badge */}
              <div className="absolute top-4 left-4">
                <span className="text-white/80 text-[10px] font-semibold uppercase tracking-wider bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
                  Video Ad
                </span>
              </div>

              {/* Center play button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-14 h-14 bg-white/30 rounded-full flex items-center justify-center border border-white/50 backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              {/* Bottom text */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-white font-bold text-base mb-1">{industry.title}</h3>
                <p className="text-white/75 text-xs leading-relaxed">{industry.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
