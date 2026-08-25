import Link from "next/link";

const title = "Privacy Policy";
const description = "How Customers.Direct collects, uses, and protects your information.";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "August 25, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm font-semibold text-[#2563EB] mb-8 inline-block">
          ← Back to Customers.Direct
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-[#0F172A] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#94A3B8] mb-10">Last updated: {UPDATED}</p>

        <div className="prose-sm flex flex-col gap-6 text-[#334155] text-sm leading-relaxed">
          <p>
            This Privacy Policy explains how Customers.Direct (&quot;Customers.Direct,&quot; &quot;we,&quot;
            &quot;us&quot;) collects, uses, and shares information when you use our website and AI search
            visibility platform (the &quot;Service&quot;).
          </p>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">Information we collect</h2>
            <p className="mb-2">
              <strong>Account information.</strong> When you sign up, we collect your name, email address,
              and, if you sign in with Google, basic profile information Google shares with us (name, email,
              profile photo).
            </p>
            <p className="mb-2">
              <strong>Business information.</strong> To provide the Service, we collect information about
              your business — website, industry, location, description, competitors, and the buyer-intent
              prompts you choose to track. Some of this is entered by you; some is extracted automatically
              from your public website (meta tags, structured data) and shown to you for confirmation before
              it&apos;s saved.
            </p>
            <p>
              <strong>Usage data.</strong> We collect standard technical information (IP address, browser
              type, pages visited) to operate and improve the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">How we use your information</h2>
            <p>
              We use your information to operate the Service: running AI visibility scans, calculating your
              Direct Score, generating opportunity recommendations, and communicating with you about your
              account. We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">Third-party AI providers</h2>
            <p>
              To measure how AI assistants respond to buyer-intent prompts about your business, we send your
              business name and the tracked prompt text to third-party AI providers (such as OpenAI,
              Anthropic, and Perplexity) via their official APIs, and store the responses they return. We do
              not send sensitive personal data to these providers as part of this process.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">Data storage and security</h2>
            <p>
              Your data is stored with Supabase, using row-level security so that only you can access your
              own business&apos;s data. We use industry-standard measures to protect your information, but no
              system is completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">Your choices</h2>
            <p>
              You can edit or delete your tracked prompts, competitors, and business details at any time from
              your dashboard. To delete your account entirely, contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">Contact us</h2>
            <p>
              Questions about this policy? Email{" "}
              <a href="mailto:jordannassie@gmail.com" className="text-[#2563EB] font-semibold">
                jordannassie@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
