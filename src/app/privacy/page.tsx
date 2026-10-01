import Link from "next/link";
import { Bullets, ContactLink, LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { deletionWaitDays } from "@/modules/account";
import { pageMetadata } from "@/lib/site-metadata";
import { AiProviders, Subprocessors } from "./_sections/providers";
import { DataRetention } from "./_sections/retention";

export const metadata = pageMetadata({
  title: "Privacy policy",
  description:
    "What Customers.Direct collects, what we send to AI companies and other providers, how long we keep it, and how to delete your account.",
  path: "/privacy",
});

const link = "font-semibold text-primary";
const label = "font-semibold";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          This policy explains what information Customers.Direct (&quot;we&quot;, &quot;us&quot;) collects when you use
          our website and app, what we do with it, who we share it with and how to delete it. The rules for using the
          service are in our <Link href="/terms" className={link}>terms of service</Link>.
        </p>
      }
    >
      <LegalSection id="collect" title="What we collect">
        <Bullets>
          <li>
            <strong className={label}>Account.</strong> Your email address and password. If you sign in with Google, we
            also get your name and profile photo from Google.
          </li>
          <li>
            <strong className={label}>Businesses.</strong> The details of each business you add: name, website, phone,
            city, region, country, industry, description, services, competitors, the questions you track and your logo if
            you upload one. Some of this is filled in from the business website or Google Maps, and you check it before
            it is saved.
          </li>
          <li>
            <strong className={label}>Results.</strong> The answers AI assistants give to your questions, the businesses
            they named and the scores we work out from them.
          </li>
          <li>
            <strong className={label}>Billing.</strong> Stripe collects your card and billing address. We never see or
            store your card number. We keep your plan, credit balance and payment status.
          </li>
          <li>
            <strong className={label}>Messages.</strong> If you use our contact form or chat box, we keep your name,
            email, company, website, phone and message. We also keep a record of each email we send you.
          </li>
          <li>
            <strong className={label}>Technical.</strong> To limit abuse, we keep a scrambled (hashed) form of your IP
            address, not the address itself. Our hosting provider also keeps standard request logs.
          </li>
        </Bullets>
      </LegalSection>

      <LegalSection id="use" title="How we use it">
        <p>
          We use your information to run the service: to ask AI assistants your questions, show your results, explain
          what competitors do differently, send your emails, take payments and answer your messages. We do not sell your
          personal information, and we do not use it for advertising.
        </p>
      </LegalSection>

      <AiProviders />

      <LegalSection id="google" title="Google Maps data">
        <p>
          We use Google Maps to suggest business details and competitors, and to show Google ratings, review counts and
          opening hours. From Google, we only store the place ID that points to each business. Everything else is fetched
          live each time it is shown, with Google&apos;s attribution.
        </p>
      </LegalSection>

      <LegalSection id="share-links" title="Share links">
        <p>
          A report share link can be opened by anyone who has it, without logging in. It shows the business name, score,
          AI results, competitors and fix step titles. It is hidden from search engines. You can turn it off at any time
          from the Share button on your Overview.
        </p>
      </LegalSection>

      <LegalSection id="emails" title="Emails">
        <Bullets>
          <li>
            We send emails about your account and billing: a welcome email, a reminder 3 days before your trial ends,
            failed payment notices, low credit notices and deletion confirmations. You cannot turn these off while you have an
            account.
          </li>
          <li>
            The weekly report email is optional. Use the unsubscribe link at the bottom of any weekly report to stop it.
          </li>
          <li>Login emails, such as confirming your address or resetting your password, are sent by Supabase.</li>
        </Bullets>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and analytics">
        <p>
          We only use the cookies needed to keep you logged in. We do not use analytics, advertising or tracking cookies.
          Our chat box and the setup form keep a few choices in your browser&apos;s session storage, which is cleared when
          you close the tab.
        </p>
      </LegalSection>

      <Subprocessors />

      <DataRetention deletionDays={deletionWaitDays()} />

      <LegalSection id="choices" title="Your choices">
        <Bullets>
          <li>Edit your business details, questions and competitors at any time in the app.</li>
          <li>Turn off share links and unsubscribe from the weekly report.</li>
          <li>Delete a business or your whole account from Settings.</li>
          <li>Email us to ask for a copy of your data or to correct it.</li>
        </Bullets>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <p>
          Your data is stored with Supabase. Each account can only read its own data, enforced by the database itself. Card
          details go straight to Stripe. We work to protect your information, but no system is completely secure.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>We may update this policy. When we do, we will change the effective date at the top of this page.</p>
      </LegalSection>

      <LegalSection id="contact" title="Contact us">
        <p>
          Questions about your data? Email <ContactLink /> or use our{" "}
          <Link href="/contact" className={link}>contact page</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
