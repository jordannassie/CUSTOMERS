export default function ProcessSection() {
  const steps = [
    {
      number: "1",
      accentColor: "bg-[#2563EB]",
      textColor: "text-[#2563EB]",
      bgColor: "bg-[#EFF6FF]",
      title: "We create your ads",
      description: "Scroll-stopping video ads made for your audience.",
      visual: (
        <div className="w-full flex justify-center py-4">
          <div className="w-20 h-36 rounded-xl overflow-hidden relative shadow-md">
            <video
              src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/Video/Girl%20ugc.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="text-white text-[7px] font-semibold opacity-90 tracking-wider">VIDEO AD</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: "2",
      accentColor: "bg-[#7C3AED]",
      textColor: "text-[#7C3AED]",
      bgColor: "bg-[#F5F3FF]",
      title: "We run the campaigns",
      description: "Targeted Meta campaigns put your business in front of the right people.",
      visual: (
        <div className="w-full flex justify-center py-4">
          <div className="bg-white border border-gray-200 rounded-xl p-3 w-40">
            <div className="text-[9px] font-semibold text-[#64748B] mb-2">Campaign · Active</div>
            <div className="flex gap-2">
              <div className="flex-1 bg-[#F5F3FF] rounded p-1.5">
                <div className="text-[8px] text-[#64748B]">Reach</div>
                <div className="text-sm font-black text-[#7C3AED]">18K</div>
              </div>
              <div className="flex-1 bg-[#EFF6FF] rounded p-1.5">
                <div className="text-[8px] text-[#64748B]">Msgs</div>
                <div className="text-sm font-black text-[#2563EB]">47</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: "3",
      accentColor: "bg-[#FF6B6B]",
      textColor: "text-[#FF6B6B]",
      bgColor: "bg-[#FFF5F5]",
      title: "Customers DM you",
      description: "Interested customers message your business directly.",
      visual: (
        <div className="w-full flex justify-center py-4">
          <div className="flex flex-col gap-1.5 w-44">
            {["I'm interested!", "Do you have availability?", "Can I get a quote?"].map((msg, i) => (
              <div key={i} className="bg-[#EFF6FF] rounded-2xl rounded-tl-sm px-3 py-2">
                <span className="text-[10px] text-[#0F172A] font-medium">{msg}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      number: "4",
      accentColor: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
      title: "You close them",
      description: "You have the conversation and close the customer.",
      visual: (
        <div className="w-full flex justify-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            From video ad to new customer.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <span className={`${step.accentColor} text-white text-sm font-black w-8 h-8 rounded-full flex items-center justify-center shrink-0`}>
                  {step.number}
                </span>
                <h3 className="text-lg font-bold text-[#0F172A]">{step.title}</h3>
              </div>
              <p className="text-[#64748B] text-sm mb-2">{step.description}</p>
              <div className={`${step.bgColor} rounded-xl mt-4`}>
                {step.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
