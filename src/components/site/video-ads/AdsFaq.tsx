const FAQ = [
  {
    q: "Are these real videos or AI-generated?",
    a: "Our videos are created using AI-powered production tools.",
  },
  {
    q: "Can I use these videos in paid advertising?",
    a: "Videos are intended for use in paid social advertising, subject to applicable platform policies and the commercial rights of the assets used.",
  },
  {
    q: "Do I need to film anything?",
    a: "No filming is required. Share your brand and product information, and we'll create your video.",
  },
  {
    q: "Can I request changes?",
    a: "Each video includes one revision within the agreed creative scope.",
  },
  {
    q: "Can I order multiple videos?",
    a: "Yes. Choose our three-video or five-video package.",
  },
  {
    q: "How long does delivery take?",
    a: "We'll confirm your production timeline when your order is accepted.",
  },
] as const;

export function AdsFaq() {
  return (
    <section id="faq" className="scroll-mt-28 py-20 sm:py-24">
      <div className="mx-auto max-w-[760px] px-4 sm:px-6">
        <h2 className="font-display font-semibold text-center text-[32px] text-foreground sm:text-[40px]">
          FAQ
        </h2>
        <div className="mt-10 flex flex-col gap-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-xl bg-surface px-5 py-4">
              <summary className="cursor-pointer list-none text-[16px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-brand motion-safe:group-open:rotate-45" aria-hidden="true">+</span>
                </span>
              </summary>
              <p className="pt-3 text-[15px] leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
