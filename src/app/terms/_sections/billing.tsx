import Link from "next/link";
import { Bullets, LegalSection } from "@/components/legal/LegalPage";

type Props = { trialDays: number; trialCredits: number; trialBusinesses: number };

// MVP_SPEC 4, 11.5 and B-41 to B-45: every rule here mirrors what the billing code does today.
export function BillingTerms({ trialDays, trialCredits, trialBusinesses }: Props) {
  return (
    <>
      <LegalSection id="trial" title="Free trial">
        <Bullets>
          <li>The trial lasts {trialDays} days. You need to add a card to start it, and you pay $0 that day.</li>
          <li>
            It covers up to {trialBusinesses} businesses and includes {trialCredits} trial credits. Trial credits end when
            the trial ends, even if you have not used them.
          </li>
          <li>
            On day {trialDays} we charge your card automatically for the plan you chose, for each business on your
            account, unless you cancel before then. The card screen shows the price and the exact date of that charge.
          </li>
          <li>We email you 3 days before the trial ends.</li>
          <li>Each account gets one trial. An account that has already had a trial or a paid plan does not get another one.</li>
          <li>
            If you cancel during the trial, you are not charged. When the trial ends you can still see your past results,
            but you cannot run new checks, add businesses or buy top-ups until you choose a plan.
          </li>
        </Bullets>
      </LegalSection>

      <LegalSection id="plans" title="Plans and automatic renewal">
        <p>
          Plans are priced per business, per month, in US dollars. The current prices and the credits each plan includes
          are on our <Link href="/pricing" className="font-semibold text-primary">pricing page</Link>, and the card screen
          shows your price before you start.
        </p>
        <Bullets>
          <li>
            After the trial, your plan renews automatically every month on the same date, and we charge the card on file,
            until you cancel.
          </li>
          <li>All the businesses on your account renew on one date, on one invoice.</li>
          <li>
            Upgrading a business or adding a new one starts right away. We charge the difference for the rest of the
            current month straight away, and add the matching share of extra credits once that payment goes through.
          </li>
          <li>
            Downgrading a business or removing one takes effect at the end of the month you have paid for. There is no
            refund for the rest of that month, and credits you already have stay until they expire.
          </li>
        </Bullets>
      </LegalSection>

      <LegalSection id="cancel" title="How to cancel">
        <p>
          You can cancel online at any time. Log in, open Settings, then Billing, and choose Cancel plan. You do not need
          to contact us.
        </p>
        <Bullets>
          <li>Cancelling during the trial means you are never charged.</li>
          <li>
            Cancelling a paid plan takes effect at the end of the month you have paid for. You keep access and your plan
            credits until then, and we do not charge you again.
          </li>
          <li>Until that date, you can change your mind on the same page with Keep my plan.</li>
          <li>After your plan ends, your past results stay visible, but new checks stop.</li>
        </Bullets>
      </LegalSection>

      <LegalSection id="credits" title="Credits">
        <Bullets>
          <li>
            A credit pays for one check: one question asked to one AI assistant (ChatGPT, Claude or Perplexity). If we
            reuse an answer from the last 24 hours, it still costs 1 credit.
          </li>
          <li>
            Each plan adds credits every month. Credits from all businesses on your account go into one shared balance.
            Plan credits expire at the end of each billing month.
          </li>
          <li>
            Top-ups are extra credit packs you can buy. They do not expire, and they are used after your plan credits. You
            can only buy and use them while you have an active plan or trial. If your plan ends, you keep them, but you
            can only use them once you have a plan again.
          </li>
          <li>If a check fails, you are not charged for it.</li>
          <li>
            A scan that has started always finishes, even if it takes your balance below 0. The extra credits used come
            off your next credits.
          </li>
          <li>Credits have no cash value. They cannot be exchanged for money or moved to another account.</li>
        </Bullets>
      </LegalSection>

      <LegalSection id="payments" title="Failed payments">
        <p>
          If a payment fails, our payment provider Stripe tries again for about 2 weeks. During that time scheduled checks
          pause, your results stay visible, and we email you and show a notice in the app so you can update your card. If
          the payment still fails, your plan is cancelled.
        </p>
      </LegalSection>

      <LegalSection id="refunds" title="Refunds">
        <Bullets>
          <li>Monthly plan charges are not refunded, including part months, downgrades, removed businesses and cancelled plans.</li>
          <li>Deleting your account cancels your plan right away, with no refund.</li>
          <li>
            If you think you were charged by mistake, or want to ask about unused top-up credits, email us. We look at
            each request.
          </li>
        </Bullets>
      </LegalSection>
    </>
  );
}
