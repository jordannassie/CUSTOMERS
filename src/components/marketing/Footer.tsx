import Link from "next/link";
import { Logo } from "./Logo";

// Evaluated at build time, which is fine because every deploy rebuilds the site.
const YEAR = new Date().getFullYear();

const MODELS = [
  { name: "ChatGPT", dot: "bg-chatgpt" },
  { name: "Claude", dot: "bg-claude" },
  { name: "Perplexity", dot: "bg-perplexity" },
] as const;

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/#product" },
      { label: "Pricing", href: "/pricing" },
      { label: "Free AI check", href: "/compare" },
      { label: "For agencies", href: "/agency" },
    ],
  },
  {
    heading: "Help",
    links: [
      { label: "FAQ", href: "/#faq" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Start free trial", href: "/signup" },
    ],
  },
] as const;

const LEGAL = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
] as const;

const linkClass =
  "rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** Set showGoogleAttribution on any page that shows Google Places data (MVP_SPEC 26). */
export default function Footer({ showGoogleAttribution = false }: { showGoogleAttribution?: boolean }) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-4">
            <Logo className="h-8 w-auto" />
            <p className="max-w-xs text-sm text-muted-foreground">
              See if AI assistants recommend your business, why competitors win, and what to fix.
            </p>
            <div>
              <p className="text-[13px] font-medium">Tracks ChatGPT, Claude and Perplexity</p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="AI assistants we track">
                {MODELS.map(({ name, dot }) => (
                  <li key={name} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:contents">
            {COLUMNS.map(({ heading, links }) => (
              <nav key={heading} aria-label={heading}>
                <h2 className="text-[13px] font-semibold">{heading}</h2>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {links.map(({ label, href }) => (
                    <li key={href}>
                      <Link href={href} className={linkClass}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-[13px] text-text-hint">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>© {YEAR} Customers.Direct</p>
            <ul className="flex gap-5">
              {LEGAL.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="max-w-2xl">
            We ask each AI assistant real customer questions through its official service. Answers change over
            time, so we cannot promise any placement.
          </p>
          {showGoogleAttribution && <p>Business details on this page are from Google Maps.</p>}
        </div>
      </div>
    </footer>
  );
}
