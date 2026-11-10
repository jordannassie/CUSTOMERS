const STEPS = [
  {
    number: "1",
    title: "Choose Your Package",
    body: "Select the number of videos you want and place your order.",
  },
  {
    number: "2",
    title: "Tell Us About Your Brand",
    body: "Share your website, product, target audience, and any creative direction.",
  },
  {
    number: "3",
    title: "Get Your Video Ads",
    body: "We create your AI video ads and deliver them digitally, ready for your advertising campaigns.",
  },
] as const;

export function AdsSteps() {
  return (
    <section id="how-it-works" className="scroll-mt-28 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-[calc(1120px*var(--px,1))] px-4 sm:px-6">
          <h2 className="text-center text-[length:calc(32px*var(--px,1))] font-bold tracking-tight text-[#171717] sm:text-[length:calc(40px*var(--px,1))]">
            How It Works
          </h2>
        <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.number} className="rounded-2xl border border-[#E5E5E1] bg-[#FAFAF8] p-6">
              <p className="text-[length:calc(13px*var(--px,1))] font-bold text-[#0866F5]">Step {step.number}</p>
              <h3 className="mt-3 text-[length:calc(20px*var(--px,1))] font-bold text-[#171717]">{step.title}</h3>
              <p className="mt-3 text-[length:calc(15px*var(--px,1))] leading-relaxed text-[#777773]">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
