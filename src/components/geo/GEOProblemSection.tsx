import { Search, MessageSquareText, TrendingDown } from "lucide-react";

const POINTS = [
  {
    icon: MessageSquareText,
    title: "Your customers are asking AI, not just Googling",
    body:
      "\"Best HVAC company near me\" now gets answered by ChatGPT and Google AI Overviews before a single blue link loads.",
  },
  {
    icon: Search,
    title: "AI assistants pick a short list, not ten results",
    body:
      "There's no page two. If AI doesn't mention your business by name, that customer often never finds out you exist.",
  },
  {
    icon: TrendingDown,
    title: "Most businesses have no idea where they stand",
    body:
      "Traditional SEO tools weren't built to test what ChatGPT, Claude, or Perplexity actually say about you.",
  },
];

export default function GEOProblemSection() {
  return (
    <section className="bg-white py-20 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#777773] mb-4">
            The Shift
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#171717] leading-tight mb-4">
            Search didn&apos;t disappear. It moved.
          </h2>
          <p className="text-[#777773] max-w-xl mx-auto text-lg">
            AI answers are becoming the new front door for local and service businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-gray-100 p-7"
              style={{ boxShadow: "0 4px 24px rgba(15,23,42,0.05)" }}
            >
              <div className="w-11 h-11 rounded-xl bg-[#F0F0EC] border border-[#DBEAFE] flex items-center justify-center mb-5">
                <Icon size={20} className="text-[#777773]" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-[#171717] text-lg mb-2 leading-snug">{title}</h3>
              <p className="text-sm text-[#777773] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
