import { Bullets, LegalSection } from "@/components/legal/LegalPage";

// MVP_SPEC 5, 24 and 26: what each outside company receives, taken from the provider code in src/modules.
const SUBPROCESSORS = [
  { name: "Supabase", use: "Database, logins and file storage (such as your logo)", data: "Everything in your account" },
  { name: "Netlify", use: "Hosts the website and app", data: "Requests to our site, including your IP address" },
  { name: "Stripe", use: "Payments, invoices and the card form", data: "Your email, billing address and card details" },
  { name: "Resend", use: "Sends our emails", data: "Your email address and the email content" },
  { name: "OpenAI", use: "ChatGPT checks", data: "Questions and your business location" },
  { name: "Anthropic", use: "Claude checks, setup help and explanations", data: "Questions, business details, AI answers, website text" },
  { name: "Perplexity", use: "Perplexity checks", data: "Questions and your business location" },
  { name: "Google", use: "Google Maps business details and Google sign-in", data: "Business names or place IDs you search for" },
  { name: "Firecrawl", use: "Reads your website during setup", data: "Your website address" },
  { name: "Browserless", use: "Makes PDF reports", data: "The report share link and business name" },
] as const;

export function AiProviders() {
  return (
    <LegalSection id="ai" title="What we send to AI companies">
      <p>
        To run checks, we ask AI assistants the same kind of questions your customers ask. We never send your name, email
        address or password to an AI company.
      </p>
      <Bullets>
        <li>
          <strong className="font-semibold">Checks (OpenAI, Anthropic, Perplexity).</strong> We send each question and
          your business location (city, region and country). Questions from our library do not name your business.
          Questions you write yourself are sent as you typed them.
        </li>
        <li>
          <strong className="font-semibold">Reading answers (Anthropic).</strong> We send the AI&apos;s answer to Claude
          to pick out which businesses it recommended.
        </li>
        <li>
          <strong className="font-semibold">Explanations (Anthropic).</strong> To explain why competitors may be winning,
          we send Claude your business name, city, industry, website, description and services, the questions asked, the
          competitors the AI named and the websites it cited. Google numbers are not sent, only comparisons such as whether you have more or
          fewer reviews.
        </li>
        <li>
          <strong className="font-semibold">Setup (Firecrawl, Anthropic).</strong> When you add a business, Firecrawl
          reads up to 4 public pages of its website (such as home, about and contact). We send that text to Claude to fill
          in your business details and suggest questions. You check everything before it is saved.
        </li>
      </Bullets>
    </LegalSection>
  );
}

export function Subprocessors() {
  return (
    <LegalSection id="subprocessors" title="Companies that process data for us">
      <p>We use these companies to run the service. Each one only gets what it needs for its job.</p>
      {/* Stacked on phones so the "receives" column is never hidden behind a sideways scroll. */}
      <div className="sm:overflow-hidden sm:rounded-md sm:border sm:border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="hidden bg-muted text-muted-foreground sm:table-header-group">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Company</th>
              <th scope="col" className="px-3 py-2 font-medium">What we use it for</th>
              <th scope="col" className="px-3 py-2 font-medium">What it receives</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((row) => (
              <tr key={row.name} className="block border-t border-border py-3 align-top sm:table-row sm:py-0">
                <th scope="row" className="block font-semibold sm:table-cell sm:px-3 sm:py-2">{row.name}</th>
                <td className="block sm:table-cell sm:px-3 sm:py-2">
                  <span className="text-muted-foreground sm:hidden">Used for: </span>
                  {row.use}
                </td>
                <td className="block sm:table-cell sm:px-3 sm:py-2">
                  <span className="text-muted-foreground sm:hidden">Receives: </span>
                  {row.data}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LegalSection>
  );
}
