const STEPS = [
  {
    number: "1",
    title: "Choose your package",
    body: "Select the number of videos you want and place your order.",
  },
  {
    number: "2",
    title: "Tell us about your brand",
    body: "Share your website, product, target audience, and any creative direction.",
  },
  {
    number: "3",
    title: "Get your video ads",
    body: "We create your AI video ads and deliver them digitally, ready for your advertising campaigns.",
  },
] as const;

export function AdsSteps() {
  return (
    <section id="how-it-works" className="scroll-mt-28 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-[calc(1120px*var(--px,1))] px-4 sm:px-6">
          <h2 className="text-center text-[length:calc(32px*var(--px,1))] font-bold tracking-tight text-foreground sm:text-[length:calc(40px*var(--px,1))]">
            How it works
          </h2>
        <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.number} className="rounded-2xl border border-border bg-background p-6">
              <p className="text-[length:calc(13px*var(--px,1))] font-bold text-[#0866F5]">Step {step.number}</p>
              <h3 className="mt-3 text-[length:calc(20px*var(--px,1))] font-bold text-foreground">{step.title}</h3>
              <p className="mt-3 text-[length:calc(15px*var(--px,1))] leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
