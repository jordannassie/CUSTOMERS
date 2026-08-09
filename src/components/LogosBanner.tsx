// ─────────────────────────────────────────────────────────────────────────────
// BrandsSection — "Brands We've Helped Grow"
// ─────────────────────────────────────────────────────────────────────────────

const BRANDS = [
  {
    name: "Ricoh",
    image:
      "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/Brands/product_03.jpg.webp",
    category: "Search Engine Marketing",
    stats: [
      { value: "120x", label: "ROAS" },
      { value: "3,550", label: "Leads / 30 Days" },
    ],
  },
  {
    name: "Orangetheory",
    image:
      "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/Brands/orange-theory-finess-review.jpg.webp",
    category: "Social Media",
    stats: [
      { value: "800%", label: "CPL Decrease" },
      { value: "50", label: "Locations" },
      { value: "400+", label: "Ads / Month" },
    ],
  },
  {
    name: "HyperX",
    image:
      "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/Brands/Screenshot-2026-03-07-at-7.37.58-AM.jpg.webp",
    category: "Conversion Rate Optimization",
    stats: [
      { value: "$100M", label: "Annual Sales" },
      { value: "10+", label: "LP A/B Tests" },
    ],
  },
  {
    name: "Kia Motors",
    image:
      "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/Brands/Screenshot-2026-03-07-at-7.36.04-AM.jpg.webp",
    category: "Search Engine Optimization",
    stats: [
      { value: "140%", label: "Organic Users" },
      { value: "720%", label: "Organic Clicks" },
      { value: "3,590%", label: "Dealer Requests" },
    ],
  },
];

export default function LogosBanner() {
  return (
    <section className="bg-[#F8FAFC] py-20 px-4 sm:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-xs font-black uppercase tracking-widest text-[#2563EB] mb-3">
            Proven Experience
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F172A] mb-4">
            Brands We&apos;ve Helped Grow
          </h2>
          <p className="text-base md:text-lg text-[#64748B] max-w-xl mx-auto leading-relaxed">
            A few of the businesses our team has helped through paid media,
            customer acquisition, and digital growth.
          </p>
        </div>

        {/* 2×2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {BRANDS.map(({ name, image, category, stats }) => (
            <div
              key={name}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col sm:flex-row"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
            >
              {/* Image */}
              <div className="w-full sm:w-40 sm:shrink-0 h-48 sm:h-auto relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="flex flex-col justify-center px-6 py-6 gap-4">
                <div>
                  <p className="text-xl font-black text-[#0F172A] mb-1 uppercase tracking-wide">
                    {name}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2563EB]">
                    {category}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {stats.map(({ value, label }, i) => (
                    <div key={label} className="flex items-stretch gap-5">
                      <div>
                        <p className="text-2xl font-black text-[#0F172A] leading-none">{value}</p>
                        <p className="text-xs text-[#64748B] mt-0.5">{label}</p>
                      </div>
                      {i < stats.length - 1 && (
                        <div className="w-px bg-gray-100 self-stretch" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
