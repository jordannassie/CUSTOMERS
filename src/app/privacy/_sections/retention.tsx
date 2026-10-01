import { Bullets, LegalSection } from "@/components/legal/LegalPage";

// MVP_SPEC 23 and B-77 (migration 042): what deletion removes, what it keeps, and the shorter fixed periods.
export function DataRetention({ deletionDays }: { deletionDays: number }) {
  return (
    <LegalSection id="deletion" title="How long we keep data and how to delete it">
      <p>
        We keep your account data, including past results, for as long as you have an account. Some records are kept for
        less time:
      </p>
      <Bullets>
        <li>Scrambled IP addresses used to limit abuse: 1 day.</li>
        <li>Records of failed requests to AI companies: 7 days.</li>
        <li>AI answers we reuse for the same question: replaced after 24 hours.</li>
      </Bullets>
      <p>
        <strong className="font-semibold">Deleting your account.</strong> Go to Settings and choose Delete account, then
        type your account name to confirm. When you do:
      </p>
      <Bullets>
        <li>Your plan is canceled right away with no refund, you are logged out and the account can no longer be used.</li>
        <li>Scans stop and every share link stops working.</li>
        <li>
          {deletionDays} days later we permanently delete your businesses, questions, results, logos and login. Until
          then, email us if you deleted it by mistake and we can bring it back.
        </li>
        <li>We email you when your account is deleted and again when the data is gone.</li>
      </Bullets>
      <p>After that, we keep only:</p>
      <Bullets>
        <li>The history of credits used and added, with the link to you removed.</li>
        <li>A record of the emails we sent, with your email address removed.</li>
        <li>Your email address and account name for up to 7 more days, only to send the final confirmation.</li>
        <li>Invoices and payment records, which stay with Stripe for accounting.</li>
      </Bullets>
      <p>
        <strong className="font-semibold">Deleting one business</strong> works the same way. It disappears from your
        account right away, its plan ends at the end of the month you have paid for, and its data is deleted {deletionDays}{" "}
        days after you delete it, or once its plan has ended if that is later.
      </p>
    </LegalSection>
  );
}
