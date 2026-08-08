export default function DeliverablesSection() {
  const deliverables = [
    {
      emoji: "🎬",
      title: "Fresh Video Creatives",
      description: "New and updated videos designed to keep your campaigns performing.",
    },
    {
      emoji: "📊",
      title: "Campaign Management",
      description: "We build, launch, and manage your targeted Meta campaigns.",
    },
    {
      emoji: "📨",
      title: "DM Lead Delivery",
      description: "Interested customers message your business directly in your existing DMs.",
    },
    {
      emoji: "⚡",
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
              <div className="text-3xl mb-4">{item.emoji}</div>
              <h3 className="text-base font-bold text-[#0F172A] mb-2">{item.title}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
