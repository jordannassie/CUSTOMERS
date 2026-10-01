import Link from "next/link";
import { Bullets, ContactLink, LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { deletionWaitDays } from "@/modules/account";
import { TRIAL_CREDITS, TRIAL_DAYS } from "@/modules/billing";
import { TRIAL_MAX_BUSINESSES } from "@/modules/entitlements";
import { pageMetadata } from "@/lib/site-metadata";
import { BillingTerms } from "./_sections/billing";

export const metadata = pageMetadata({
  title: "Terms of service",
  description:
    "The terms for using Customers.Direct: the free trial, monthly plans, credits, cancelling, refunds, share links and what we can and cannot promise.",
  path: "/terms",
});

const link = "font-semibold text-primary";

export default function TermsPage() {
  const deletionDays = deletionWaitDays();
  return (
    <LegalPage
      title="Terms of service"
      intro={
        <p>
          These terms are the agreement between you and Customers.Direct (&quot;we&quot;, &quot;us&quot;) for using our
          website and app. They apply when you create an account, start a trial or pay for a plan. Please read them
          before you add your card. How we handle your data is in our{" "}
          <Link href="/privacy" className={link}>privacy policy</Link>.
        </p>
      }
    >
      <LegalSection id="service" title="What the service does">
        <p>
          Customers.Direct checks whether ChatGPT, Claude and Perplexity recommend your business when people ask the kind
          of questions local customers ask. We send each question to the AI companies through their official APIs, with
          web search on and your business location set. We then show who the AI recommended, why competitors may be
          winning, and steps you can take.
        </p>
      </LegalSection>

      <LegalSection id="no-guarantee" title="Results are estimates, not promises">
        <Bullets>
          <li>
            We do not control ChatGPT, Claude, Perplexity or Google. We cannot promise that any AI assistant will
            recommend your business, on any plan.
          </li>
          <li>
            Your score is the share of checks in the last 30 days where an AI assistant mentioned your business. It is
            not a rank, and AI answers change from day to day.
          </li>
          <li>
            Our answers come from the AI companies&apos; APIs. What a person sees when they type the same question into
            an AI app can be different.
          </li>
          <li>Fix steps are suggestions. You decide whether to make them.</li>
        </Bullets>
      </LegalSection>

      <LegalSection id="account" title="Your account">
        <Bullets>
          <li>Keep your login details safe. You are responsible for what happens under your account.</li>
          <li>Give accurate details about the businesses you add, and keep them up to date.</li>
          <li>Only add businesses you own or are allowed to manage.</li>
        </Bullets>
      </LegalSection>

      <LegalSection id="agencies" title="Agencies and their clients">
        <p>
          If you add businesses that belong to your clients, you are responsible for having each client&apos;s permission
          to add their business, run checks on it and share reports about it.
        </p>
      </LegalSection>

      <BillingTerms trialDays={TRIAL_DAYS} trialCredits={TRIAL_CREDITS} trialBusinesses={TRIAL_MAX_BUSINESSES} />

      <LegalSection id="share-links" title="Share links and reports">
        <Bullets>
          <li>
            When you create a share link for a report, anyone who has the link can see that report without logging in.
            It shows the business name, its score, AI results, competitors and fix step titles.
          </li>
          <li>Share links are hidden from search engines, but anyone you send one to can pass it on.</li>
          <li>
            You can turn a link off at any time from the Share button on your Overview. Links also stop working when you
            delete the business or your account.
          </li>
          <li>Our weekly report email includes a share link, unless you have turned your link off before.</li>
        </Bullets>
      </LegalSection>

      <LegalSection id="google" title="Google data">
        <p>
          Some details, such as Google ratings, review counts and opening hours, come from Google Maps. We fetch them live
          each time they are shown, show them with Google&apos;s attribution, and do not store them.
        </p>
      </LegalSection>

      <LegalSection id="deletion" title="Deleting your account">
        <p>
          You can delete your account from Settings. Your plan is cancelled right away with no refund, you are logged out,
          checks stop and share links stop working. We remove your data for good {deletionDays} days later. Until then,
          contact us if you want it back. Our <Link href="/privacy#deletion" className={link}>privacy policy</Link> lists
          what we delete and what we keep.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="Disclaimer">
        <p>
          The service is provided &quot;as is&quot;, without warranties of any kind. As far as the law allows, we are not
          liable for indirect or consequential losses from using it, including changes in AI recommendations, search
          rankings or business results.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to these terms">
        <p>
          We may update these terms. When we do, we will change the effective date at the top of this page. If you keep
          using the service after a change takes effect, the new terms apply.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact us">
        <p>
          Questions about these terms? Email <ContactLink /> or use our{" "}
          <Link href="/contact" className={link}>contact page</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
