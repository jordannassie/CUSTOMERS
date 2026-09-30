import StripeCheckoutButton from "./StripeCheckoutButton";

const included = [
  "AI visibility fundamentals",
  "Build your offer",
  "Choose your niche",
  "Find local prospects",
  "Outreach scripts",
  "How to present the report",
  "Pricing your service",
  "Take monthly payments",
  "Onboard your first client",
  "Deliver monthly reports",
  "Grow to 10, 20, and 40 clients",
  "Templates and checklists",
];

export default function LandingOffer() {
  return (
    <>
      <section className="border-t border-[#E5E5E1] bg-[#F5F5F2]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
            What is included in the $97 Launch Kit
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {included.map((item) => (
              <div
                key={item}
                className="bg-white border border-[#E5E5E1] rounded-[4px] px-4 py-4 text-[14px] text-[#171717]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="buy" className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="border border-[#E5E5E1] rounded-[4px] bg-white p-8 sm:p-10 max-w-[640px]">
          <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-[#2563EB]">
            Get started today
          </p>
          <h2 className="mt-3 text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
            Start your AI business today.
          </h2>
          <ul className="mt-5 space-y-2 text-[15px] text-[#6B6B67]">
            <li>AI Business Launch Kit</li>
            <li>One-time payment: $97</li>
            <li>Instant Academy access</li>
            <li>Training, scripts, templates, pricing guide, and first-client plan</li>
          </ul>
          <div className="mt-7">
            <StripeCheckoutButton
              endpoint="/api/stripe/launch-kit"
              label="Get instant access: $97"
              className="inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-semibold px-6 py-3.5 rounded-[4px] transition-colors disabled:opacity-70 w-full sm:w-auto"
            />
          </div>
          <p className="mt-4 text-[13px] text-[#737370]">
            Agency software is available separately at $199/month when you are ready
            to serve clients.
          </p>
        </div>
      </section>
    </>
  );
}
