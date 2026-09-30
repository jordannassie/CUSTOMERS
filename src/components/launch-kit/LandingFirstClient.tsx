const workflow = [
  "Enter a local business website",
  "Run an AI visibility report",
  "See competitors appearing ahead of them",
  "Send a simple outreach message",
  "Show the report",
  "Offer ongoing monthly monitoring",
];

export const OUTREACH_SCRIPT =
  "Hi. I checked how your business appears when people ask AI tools like ChatGPT for companies in your category. A few competitors are currently showing up ahead of you. I made a quick report showing what I found. Want me to send it over?";

export default function LandingFirstClient() {
  return (
    <section className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
        How you get a first client
      </h2>
      <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {workflow.map((step, index) => (
          <li
            key={step}
            className="border border-[#E5E5E1] rounded-[4px] p-4 bg-white flex gap-3"
          >
            <span className="w-7 h-7 rounded-[4px] bg-[#EFF6FF] text-[#2563EB] text-[12px] font-semibold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <span className="text-[14px] text-[#171717] leading-5">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-8 border border-[#E5E5E1] rounded-[4px] bg-[#FAFAF8] p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B6B67] mb-3">
          Outreach script
        </p>
        <p className="text-[15px] leading-7 text-[#171717] whitespace-pre-wrap">{OUTREACH_SCRIPT}</p>
      </div>
    </section>
  );
}
