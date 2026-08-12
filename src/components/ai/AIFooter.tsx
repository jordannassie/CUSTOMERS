import { Users } from "lucide-react";

const year = new Date().getFullYear();

interface FooterLink {
  label: string;
  href: string;
  highlight?: boolean;
  disabled?: boolean;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    heading: "Company",
    links: [
      { label: "How It Works", href: "#how-it-works" },
      { label: "Features", href: "#features" },
      { label: "Industries", href: "#industries" },
      { label: "Pricing", href: "#pricing" },
      { label: "Contact", href: "#demo" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "AI Receptionist", href: "/" },
      { label: "FAQs", href: "#faq" },
    ],
  },
  {
    heading: "Sales",
    links: [
      { label: "Sales Program", href: "/sales", highlight: true },
      { label: "Sales Login", href: "/sales/dashboard" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "#", disabled: true },
      { label: "Terms of Service", href: "#", disabled: true },
    ],
  },
];

export default function AIFooter() {
  return (
    <footer className="bg-[#0F172A] text-white px-4 pt-16 pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Sales CTA banner */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-[#1E293B] to-[#0F172A] border border-white/10 rounded-2xl px-6 py-5 mb-14"
        >
          <div>
            <p className="font-bold text-white">Want to sell Customers Direct AI Receptionist?</p>
            <p className="text-sm text-white/60 mt-0.5">Join our sales program and help businesses capture more opportunities.</p>
          </div>
          <a
            href="/sales"
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Users size={15} aria-hidden="true" />
            Join Our Sales Team
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="/" aria-label="Customers.Direct — Home" className="inline-block mb-4">
              <span className="text-white font-black text-[26px] tracking-tight">
                Customers.Direct
              </span>
            </a>
            <p className="text-sm text-white/50 leading-relaxed">
              Customers.Direct helps businesses capture more opportunities with
              AI-powered customer communication.
            </p>
          </div>

          {/* Columns */}
          {COLUMNS.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="font-bold text-xs text-white/50 uppercase tracking-widest mb-4">
                {heading}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ label, href, highlight, disabled }) => (
                  <li key={label}>
                    {disabled ? (
                      <span className="text-sm text-white/30 cursor-default">{label}</span>
                    ) : highlight ? (
                      <a
                        href={href}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2563EB] hover:text-[#60a5fa] transition-colors"
                      >
                        {label} →
                      </a>
                    ) : (
                      <a
                        href={href}
                        className="text-sm text-white/50 hover:text-white transition-colors"
                      >
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <hr className="border-white/10 mb-6" />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-white/40">
            © {year} Customers.Direct. All rights reserved.
          </p>
          <a
            href="/admin"
            className="text-xs text-white/20 hover:text-white/50 transition-colors"
          >
            Admin
          </a>
        </div>
      </div>
    </footer>
  );
}
