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
    <section id="how-it-works" className="scroll-mt-28 bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
          <h2 className="font-serif font-normal text-center text-[32px] text-foreground sm:text-[40px]">
            How It Works
          </h2>
        <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.number} className="rounded-xl bg-surface p-6">
              <p className="text-[13px] font-bold text-brand">Step {step.number}</p>
              <h3 className="font-serif font-normal mt-3 text-[20px] text-foreground">{step.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
