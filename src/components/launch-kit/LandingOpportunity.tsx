import { Search, Presentation, Handshake, Eye, GitCompare, MessageSquareText, FileBarChart } from "lucide-react";

const prompts = [
  "Who is the best roofer near me?",
  "What dentist should I choose in Dallas?",
  "Find a top med spa nearby.",
];

const steps = [
  {
    icon: Search,
    title: "Find",
    body: "Find a local business that wants more customers.",
  },
  {
    icon: Presentation,
    title: "Show",
    body: "Use Customers.Direct to show how they appear in AI search versus competitors.",
  },
  {
    icon: Handshake,
    title: "Sell",
    body: "Offer ongoing AI visibility monitoring and reporting for a monthly fee.",
  },
];

const services = [
  {
    icon: Eye,
    title: "AI visibility monitoring",
    body: "Check whether ChatGPT, Claude, and Perplexity name the business for local questions.",
  },
  {
    icon: GitCompare,
    title: "Competitor tracking",
    body: "See which nearby businesses get recommended instead, and on which questions.",
  },
  {
    icon: MessageSquareText,
    title: "AI prompt tracking",
    body: "Follow the questions customers actually ask, not a made-up keyword list.",
  },
  {
    icon: FileBarChart,
    title: "Monthly white-label reporting",
    body: "Send a client-ready report each month under your own name and brand.",
  },
];

export default function LandingOpportunity() {
  return (
    <>
      <section className="border-t border-[#E5E5E1] bg-[#F5F5F2]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#171717] max-w-[640px]">
            Businesses are asking a new question: Does AI recommend us?
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-[#6B6B67] max-w-[640px]">
            Owners already worry about Google. They now also want to know how they
            appear in ChatGPT, Gemini, Perplexity, and AI search. If the answer
            names a competitor, they never get the call.
          </p>
          <div className="mt-8 grid sm:grid-cols-3 gap-3">
            {prompts.map((prompt) => (
              <div
                key={prompt}
                className="bg-white border border-[#E5E5E1] rounded-[4px] p-4 text-[14px] text-[#171717]"
              >
                <span>&quot;{prompt}&quot;</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[15px] text-[#171717] max-w-[640px]">
            A business needs to know whether AI recommends them, or the shop down
            the road.
          </p>
        </div>
      </section>

      <section className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
          How it works
        </h2>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {steps.map((step, index) => (
            <div key={step.title} className="border border-[#E5E5E1] bg-white rounded-[4px] p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-[4px] bg-[#EFF6FF] text-[#2563EB] text-[13px] font-semibold flex items-center justify-center">
                  {index + 1}
                </span>
                <step.icon size={18} className="text-[#2563EB]" />
                <h3 className="text-[18px] font-semibold text-[#171717]">{step.title}</h3>
              </div>
              <p className="text-[14px] leading-6 text-[#6B6B67]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[#E5E5E1] bg-white">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
            A service local businesses can understand.
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {services.map((item) => (
              <div key={item.title} className="border border-[#E5E5E1] rounded-[4px] p-6 bg-[#FAFAF8]">
                <item.icon size={18} className="text-[#2563EB] mb-3" />
                <h3 className="text-[16px] font-semibold text-[#171717]">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#6B6B67]">{item.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[18px] font-semibold text-[#171717]">
            Customers.Direct powers the technology. You build the client relationship.
          </p>
        </div>
      </section>
    </>
  );
}
