// ─────────────────────────────────────────────────────────────────────────────
// DifferenceSection — Traditional vs Customers Direct comparison
// ─────────────────────────────────────────────────────────────────────────────

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconSteps({ blue }: { blue?: boolean }) {
  const c = blue ? "#2563EB" : "#64748B";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="16" height="3" rx="1.5" fill={c} opacity="0.25" />
      <rect x="2" y="8.5" width="11" height="3" rx="1.5" fill={c} opacity="0.5" />
      <rect x="2" y="14" width="7" height="3" rx="1.5" fill={c} />
    </svg>
  );
}
function IconDelay({ blue }: { blue?: boolean }) {
  const c = blue ? "#2563EB" : "#64748B";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke={c} strokeWidth="1.8" />
      <path d="M10 6v4l2.5 2.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconLost({ blue }: { blue?: boolean }) {
  const c = blue ? "#2563EB" : "#64748B";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 10h14M13 6l4 4-4 4" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconFollow({ blue }: { blue?: boolean }) {
  const c = blue ? "#2563EB" : "#64748B";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M17 3H3a1 1 0 00-1 1v10a1 1 0 001 1h2v2.5l3-2.5h9a1 1 0 001-1V4a1 1 0 00-1-1z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TRADITIONAL = [
  {
    Icon: IconSteps,
    title: "Multiple Steps",
    body: "Customers click ads, visit websites, fill out forms, and move through several steps before talking to someone.",
  },
  {
    Icon: IconDelay,
    title: "Delays & Friction",
    body: "Every additional step creates another opportunity for a potential customer to leave.",
  },
  {
    Icon: IconLost,
    title: "Lost Leads",
    body: "Businesses often have to chase leads later through phone calls, emails, or forms.",
  },
  {
    Icon: IconFollow,
    title: "Harder Follow-Up",
    body: "The initial interest and the eventual sales conversation happen in separate places.",
  },
];

const CD = [
  {
    Icon: IconSteps,
    title: "One Click to Chat",
    body: "Customers tap the ad and move directly into a conversation.",
  },
  {
    Icon: IconDelay,
    title: "Instant Engagement",
    body: "Start the conversation while the customer is actively interested.",
  },
  {
    Icon: IconLost,
    title: "Real Conversations",
    body: "Instead of sending people through a long funnel, your business can talk directly with interested prospects.",
  },
  {
    Icon: IconFollow,
    title: "Easy Follow-Up",
    body: "The conversation stays in the DM thread, making it simple to respond and continue the relationship.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DifferenceSection() {
  return (
    <section id="how-it-works" className="bg-white py-20 px-4 sm:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto">

        {/* ── Headline ── */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F172A] leading-tight">
            Most ads send customers through a website.{" "}
            <span className="text-[#2563EB]">We send them directly into a conversation.</span>
          </h2>
        </div>

        {/* ── Image — fully responsive, no horizontal scroll ── */}
        <div className="w-full mb-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/People/Difference.png"
            alt="Traditional: Ad → Website → Form → Wait → Phone Call. Customers Direct: Ad → DM → Conversation."
            className="w-full h-auto rounded-2xl sm:rounded-3xl border border-gray-100"
            style={{
              maxWidth: "100%",
              display: "block",
              margin: "0 auto",
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            }}
          />
        </div>

        {/* ── Sub-heading ── */}
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
            The difference that drives real results.
          </h3>
        </div>

        {/* ── Two-column comparison ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>

          {/* Traditional */}
          <div className="bg-[#F8FAFC] px-8 py-10 md:border-r border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mb-6">
              Traditional Customer Acquisition
            </p>
            <div className="flex flex-col gap-7">
              {TRADITIONAL.map(({ Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <div className="mt-0.5 shrink-0">
                    <Icon />
                  </div>
                  <div>
                    <p className="font-bold text-[#0F172A] mb-1">{title}</p>
                    <p className="text-sm text-[#64748B] leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customers Direct */}
          <div className="bg-white px-8 py-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#2563EB] mb-6">
              Customers Direct
            </p>
            <div className="flex flex-col gap-7">
              {CD.map(({ Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <div className="mt-0.5 shrink-0">
                    <Icon blue />
                  </div>
                  <div>
                    <p className="font-bold text-[#0F172A] mb-1">{title}</p>
                    <p className="text-sm text-[#475569] leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom callout ── */}
        <div className="text-center mt-14">
          <p className="text-xl sm:text-2xl font-black text-[#0F172A] leading-snug max-w-xl mx-auto">
            We don&apos;t just send you leads.{" "}
            <span className="text-[#2563EB]">We start conversations with potential customers.</span>
          </p>
        </div>

      </div>
    </section>
  );
}
