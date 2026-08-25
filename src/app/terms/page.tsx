const title = "Terms of Service";
const description = "The terms that govern your use of Customers.Direct.";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/terms" },
};

const UPDATED = "August 25, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <a href="/ai-search" className="text-sm font-semibold text-[#2563EB] mb-8 inline-block">
          ← Back to Customers.Direct
        </a>
        <h1 className="text-3xl sm:text-4xl font-black text-[#0F172A] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#94A3B8] mb-10">Last updated: {UPDATED}</p>

        <div className="flex flex-col gap-6 text-[#334155] text-sm leading-relaxed">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of Customers.Direct&apos;s website and
            AI search visibility platform (the &quot;Service&quot;), operated by Customers.Direct
            (&quot;we,&quot; &quot;us&quot;). By using the Service, you agree to these Terms.
          </p>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">The Service</h2>
            <p>
              Customers.Direct measures, reports on, and helps you improve how often AI assistants (such as
              ChatGPT, Claude, and Perplexity) mention your business in response to buyer-intent questions. We
              do this by querying AI providers&apos; official APIs directly — this differs from what a user
              might see typing the same question into a consumer chat app, and results can change at any
              time as AI models change.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">No guaranteed results</h2>
            <p>
              We do not control any AI provider&apos;s models, and we cannot and do not guarantee that your
              business will be mentioned, ranked, or featured in any AI product, ever — regardless of plan or
              price. Direct Score, mention rates, and opportunity recommendations are measurements and
              suggestions based on real data, not promises of outcome.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">Your account</h2>
            <p>
              You&apos;re responsible for the accuracy of the business information you provide and for
              keeping your account credentials secure. You may not use the Service for any business you
              don&apos;t own or have authorization to represent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">Subscriptions and billing</h2>
            <p>
              Paid plans are billed on a recurring basis as described at the time of purchase. You can cancel
              at any time; cancellation takes effect at the end of the current billing period unless stated
              otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">&quot;Have Customers.Direct Fix It&quot; requests</h2>
            <p>
              When you request that our team implement a recommended change, we&apos;ll review your request
              and may follow up before making any changes to your website or online presence. We&apos;ll never
              publish changes without your knowledge as part of this flow.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">Disclaimer and limitation of liability</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind. To the fullest extent
              permitted by law, Customers.Direct is not liable for indirect, incidental, or consequential
              damages arising from your use of the Service, including changes in AI visibility, search
              rankings, or business outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes take
              effect means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-2">Contact us</h2>
            <p>
              Questions about these Terms? Email{" "}
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
