function IconVideoCreatives() {
  return (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}>
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    </div>
  );
}

function IconCampaign() {
  return (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)" }}>
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    </div>
  );
}

function IconDMLeads() {
  return (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#FF6B6B,#F59E0B)" }}>
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
      </svg>
    </div>
  );
}

function IconOptimize() {
  return (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#22C55E,#16A34A)" }}>
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
  );
}

export default function DeliverablesSection() {
  const deliverables = [
    {
      icon: <IconVideoCreatives />,
      title: "Fresh Video Creatives",
      description: "New and updated videos designed to keep your campaigns performing.",
    },
    {
      icon: <IconCampaign />,
      title: "Campaign Management",
      description: "We build, launch, and manage your targeted Meta campaigns.",
    },
    {
      icon: <IconDMLeads />,
      title: "DM Lead Delivery",
      description: "Interested customers message your business directly in your existing DMs.",
    },
    {
      icon: <IconOptimize />,
      title: "Monthly Optimization",
      description: "We review campaign performance and optimize for better conversations.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            What you get every month.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {deliverables.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="mb-4">{item.icon}</div>
              <h3 className="text-base font-bold text-[#0F172A] mb-2">{item.title}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
