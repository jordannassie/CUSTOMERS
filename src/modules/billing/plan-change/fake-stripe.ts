import type Stripe from "stripe";
import { invoice } from "../stripe-objects";
import type { PlanChangeStripe } from "./client";
import type { ItemSpec } from "./planner";
import { endsPlan, mergedMetadata, monthAfter, noUpcomingInvoice, PRICES, pricedSpec, prorationLines, renewalInvoice, scheduleObject, seededPrices, subscriptionObject, uniquePrices } from "./fake-stripe-objects";
import type { FakeSchedule, Item, Phase, Priced, PriceTable } from "./fake-stripe-objects";

export { at, PRICES, type PriceTable } from "./fake-stripe-objects";

/** A card error like Stripe's 402, carrying the bill so pending_if_incomplete can leave it open. */
const chargeError = (failure: "decline" | "action", bill: Stripe.Invoice) =>
  Object.assign(new Error(failure === "action" ? "This payment requires authentication." : "Your card was declined."), {
    type: "StripeCardError",
    statusCode: 402,
    code: failure === "action" ? "subscription_payment_intent_requires_action" : "card_declined",
    fakeBill: bill,
    fakeFailure: failure,
  });

// An in-memory Stripe standing in for a Stripe test clock: one subscription, its schedule, prorations, renewals
// and invoices, with a clock the caller moves. Plan change tests use it, and so do the billing fixtures
// (STRIPE_CHECKOUT_FIXTURES, B-46). It follows Stripe's documented behavior; the real test-clock run is still to
// do once the sandbox exists (B-01, B-40).

export class FakeStripe implements PlanChangeStripe {
  clock: number;
  status: Stripe.Subscription.Status;
  trialEnd: number | null = null;
  cancelAtPeriodEnd = false;
  items: Item[] = [];
  schedule: FakeSchedule | null = null;
  invoices: Stripe.Invoice[] = [];
  calls: { method: string; params?: unknown; key?: string }[] = [];
  declineNextCharge = false;
  /** The next charge needs the bank's confirmation (3D Secure, card 4000 0025 0000 3155). */
  requireActionNextCharge = false;
  /** Payment intents of charges left pending (pending_if_incomplete), by id. */
  intents = new Map<string, Stripe.PaymentIntent.Status>();
  /** Applies the update left pending once its payment is approved; see approvePending. */
  private pendingApply: (() => void) | null = null;
  private seen = new Map<string, unknown>();
  private nextId = 1;

  readonly subscriptionId: string;
  readonly customerId: string;
  readonly agencyId: string | null;
  readonly prices: PriceTable;

  constructor(opts: {
    now: number;
    status?: Stripe.Subscription.Status;
    periodStart: number;
    /** Defaults to one month after periodStart. */
    periodEnd?: number;
    items: { businessId: string; price: string; itemId?: string }[];
    prices?: PriceTable;
    ids?: { subscription: string; customer: string; agency: string };
  }) {
    this.clock = opts.now;
    this.prices = { ...(opts.prices ?? PRICES) };
    this.subscriptionId = opts.ids?.subscription ?? "sub_fake";
    this.customerId = opts.ids?.customer ?? "cus_fake";
    this.agencyId = opts.ids?.agency ?? null;
    this.status = opts.status ?? "active";
    const end = opts.periodEnd ?? monthAfter(opts.periodStart);
    if (this.status === "trialing") this.trialEnd = end;
    const ownPrice = seededPrices(this.prices);
    const start = opts.periodStart;
    this.items = opts.items.map((i) => ({ id: i.itemId ?? `si_${i.businessId}`, price: ownPrice(i.price), quantity: 1, metadata: { business_id: i.businessId }, start, end }));
  }

  // IDs are unique across fakes: the database keeps item IDs unique, and parallel Playwright tests each run a fake.
  private tag = crypto.randomUUID().slice(0, 8);
  private id = (prefix: string) => `${prefix}_fake${this.tag}_${this.nextId++}`;

  subscription(): Stripe.Subscription {
    return subscriptionObject(this);
  }

  scheduleObject(): Stripe.SubscriptionSchedule {
    return scheduleObject(this.schedule!, this.clock, this.prices);
  }

  private once<T>(key: string, run: () => T): T {
    if (this.seen.has(key)) return this.seen.get(key) as T;
    const result = run();
    this.seen.set(key, result);
    return result;
  }

  private periodEnd = () => Math.min(...this.items.map((i) => i.end));
  private periodStart = () => Math.min(...this.items.map((i) => i.start));

  private specs = (): Priced[] => this.items.map((i) => ({ price: i.price, quantity: i.quantity, metadata: { ...i.metadata } }));

  private priced = (spec: ItemSpec | Stripe.SubscriptionUpdateParams.Item): Priced => pricedSpec(spec, this.prices, () => this.id("price_inline"));

  private pricedAll = (items: unknown): Priced[] => uniquePrices((items as ItemSpec[]).map((i) => this.priced(i)));

  private renewalInvoice = (items: Priced[], start: number): Stripe.Invoice => renewalInvoice(this, items, start);

  private prorationInvoice(to: Priced[], date: number): Stripe.Invoice {
    const lines = this.status === "trialing" ? [] : prorationLines(this, this.specs(), to, date);
    return invoice({ customer: this.customerId, subscriptionId: this.subscriptionId, billingReason: "subscription_update", lines, status: "open" });
  }

  /** Moves the subscription to `to` now, charging the proration. A declined card changes nothing with error_if_incomplete;
   * without it (a schedule update has none) Stripe applies the change, leaves the invoice open and goes past due. */
  private changeNow(to: Priced[], date: number, errorIfIncomplete = true) {
    const bill = this.prorationInvoice(to, date);
    const failure = bill.amount_due > 0 ? this.takeFailure() : null;
    const declined = failure !== null;
    if (failure) {
      if (errorIfIncomplete) throw chargeError(failure, bill);
      this.status = "past_due";
    }
    if (bill.lines.data.length > 0) this.invoices.push(declined ? bill : { ...bill, status: "paid", amount_paid: bill.amount_due });
    this.setItems(to);
  }

  /** trial_end "now": the period restarts today and the whole first month is invoiced at once. */
  private endTrialNow(errorIfIncomplete: boolean) {
    const bill = this.renewalInvoice(this.specs(), this.clock);
    const failure = bill.amount_due > 0 ? this.takeFailure() : null;
    const declined = failure !== null;
    if (failure && errorIfIncomplete) throw chargeError(failure, bill);
    this.trialEnd = this.clock;
    this.status = declined ? "past_due" : "active";
    this.items = this.items.map((i) => ({ ...i, start: this.clock, end: monthAfter(this.clock) }));
    this.invoices.push(declined ? bill : { ...bill, status: "paid", amount_paid: bill.amount_due });
  }

  private setItems(to: Priced[]) {
    uniquePrices(to);
    const start = this.periodStart();
    const end = this.periodEnd();
    this.items = to.map((spec) => {
      const existing = this.items.find((i) => i.metadata.business_id === spec.metadata.business_id);
      return { id: existing?.id ?? this.id("si"), ...spec, metadata: { ...spec.metadata }, start, end };
    });
  }

  private withItemParams(params: Stripe.SubscriptionUpdateParams.Item[]): Priced[] {
    let specs = this.specs();
    for (const p of params) {
      const target = this.items.find((i) => i.id === p.id);
      if (p.deleted) specs = specs.filter((s) => s.metadata.business_id !== target?.metadata.business_id);
      else if (target) {
        const price = this.priced({ ...p, metadata: {} }).price;
        specs = specs.map((s) => (s.metadata.business_id === target.metadata.business_id ? { ...s, price } : s));
      } else specs.push(this.priced(p));
    }
    return specs;
  }

  async retrieveSubscription() {
    this.calls.push({ method: "retrieveSubscription" });
    return this.subscription();
  }

  async retrieveSchedule() {
    this.calls.push({ method: "retrieveSchedule" });
    return this.scheduleObject();
  }

  async createScheduleFromSubscription(_id: string, key: string) {
    this.calls.push({ method: "createScheduleFromSubscription", key });
    return this.once(key, () => {
      this.schedule = {
        id: this.id("sub_sched"),
        status: "active",
        endBehavior: "release",
        phases: [{ start: this.periodStart(), end: this.periodEnd(), items: this.specs() }],
      };
      return this.scheduleObject();
    });
  }

  async updateSchedule(_id: string, params: Stripe.SubscriptionScheduleUpdateParams, key: string) {
    this.calls.push({ method: "updateSchedule", params, key });
    return this.once(key, () => {
      const [first, second] = params.phases!;
      const current: Phase = { start: first.start_date as number, end: first.end_date as number, items: this.pricedAll(first.items) };
      const phases = [current];
      if (second) phases.push({ start: current.end, end: monthAfter(current.end), items: this.pricedAll(second.items) });
      if (params.proration_behavior === "always_invoice") this.changeNow(current.items, this.clock, false);
      // Stripe puts a changed current phase in place at once; with no proration nothing is billed.
      else if (params.proration_behavior === "none") this.setItems(current.items);
      const metadata = mergedMetadata(this.schedule!.metadata, params.metadata);
      this.schedule = { ...this.schedule!, phases, endBehavior: params.end_behavior ?? this.schedule!.endBehavior, metadata };
      return this.scheduleObject();
    });
  }

  async releaseSchedule(_id: string, key: string) {
    this.calls.push({ method: "releaseSchedule", key });
    return this.once(key, () => {
      this.schedule!.status = "released";
      return this.scheduleObject();
    });
  }

  private takeFailure(): "decline" | "action" | null {
    const failure = this.declineNextCharge ? "decline" : this.requireActionNextCharge ? "action" : null;
    this.declineNextCharge = false;
    this.requireActionNextCharge = false;
    return failure;
  }

  private applyUpdate(params: Stripe.SubscriptionUpdateParams) {
    const strict = params.payment_behavior === "error_if_incomplete" || params.payment_behavior === "pending_if_incomplete";
    if (params.cancel_at_period_end !== undefined) this.cancelAtPeriodEnd = params.cancel_at_period_end;
    if (params.items) this.changeNow(this.withItemParams(params.items), params.proration_date ?? this.clock);
    if (params.trial_end === "now" && this.status === "trialing") this.endTrialNow(strict);
  }

  async updateSubscription(_id: string, params: Stripe.SubscriptionUpdateParams, key: string) {
    this.calls.push({ method: "updateSubscription", params, key });
    return this.once(key, () => {
      // Stripe applies an update in full or not at all: a declined card thrown below undoes the item changes too.
      const before = { items: this.items, status: this.status, trialEnd: this.trialEnd, cancelAtPeriodEnd: this.cancelAtPeriodEnd, invoices: [...this.invoices] };
      try {
        this.applyUpdate(params);
      } catch (error) {
        Object.assign(this, before);
        const failed = error as { fakeBill?: Stripe.Invoice; fakeFailure?: "decline" | "action" };
        // pending_if_incomplete: nothing changes yet; the update waits on its open invoice.
        if (params.payment_behavior === "pending_if_incomplete" && failed.fakeBill) return this.leavePending(failed.fakeBill, failed.fakeFailure!, params);
        throw error;
      }
      return this.subscription();
    });
  }

  private leavePending(bill: Stripe.Invoice, failure: "decline" | "action", params: Stripe.SubscriptionUpdateParams): Stripe.Subscription {
    const intent = this.id("pi");
    this.intents.set(intent, failure === "action" ? "requires_action" : "requires_payment_method");
    const open = { ...bill, id: this.id("in"), status: "open", confirmation_secret: { type: "payment_intent", client_secret: `${intent}_secret_fake` } } as Stripe.Invoice;
    this.invoices.push(open);
    this.pendingApply = () => this.applyUpdate({ ...params, payment_behavior: "allow_incomplete" });
    return { ...this.subscription(), pending_update: { expires_at: this.clock + 82_800 }, latest_invoice: open } as unknown as Stripe.Subscription;
  }

  /** The bank approved the pending payment: Stripe pays the invoice and applies the update. */
  approvePending() {
    const open = this.invoices.find((i) => i.status === "open" && i.confirmation_secret);
    if (!open || !this.pendingApply) throw new Error("no pending update");
    const apply = this.pendingApply;
    this.pendingApply = null;
    this.invoices = this.invoices.filter((i) => i !== open);
    apply();
  }

  async retrievePaymentIntent(id: string) {
    this.calls.push({ method: "retrievePaymentIntent" });
    return { id, object: "payment_intent", status: this.intents.get(id) ?? "succeeded" } as Stripe.PaymentIntent;
  }

  async retrieveInvoice(id: string) {
    this.calls.push({ method: "retrieveInvoice" });
    const found = this.invoices.find((i) => i.id === id);
    if (!found) throw Object.assign(new Error("No such invoice"), { code: "resource_missing", statusCode: 404 });
    return found;
  }

  async voidInvoice(id: string, key: string) {
    this.calls.push({ method: "voidInvoice", key });
    return this.once(key, () => {
      this.invoices = this.invoices.map((i) => (i.id === id && i.status === "open" ? ({ ...i, status: "void" } as Stripe.Invoice) : i));
      if (this.invoices.some((i) => i.id === id && i.status === "void")) this.pendingApply = null;
      return this.invoices.find((i) => i.id === id)!;
    });
  }

  async previewInvoice(params: Stripe.InvoiceCreatePreviewParams) {
    this.calls.push({ method: "previewInvoice", params });
    if (!params.schedule_details && !params.subscription_details) {
      if (this.subscription().cancel_at !== null) throw noUpcomingInvoice();
      // The upcoming renewal: the next phase's items when a change is pending.
      const next = this.schedule?.status === "active" ? this.schedule.phases.find((p) => p.start >= this.periodEnd()) : undefined;
      return this.renewalInvoice(next?.items ?? this.specs(), this.periodEnd());
    }
    if (params.schedule_details) {
      const [first, second] = params.schedule_details.phases!;
      if (params.schedule_details.proration_behavior === "always_invoice") {
        return this.prorationInvoice(this.pricedAll(first.items), this.clock);
      }
      return this.renewalInvoice(this.pricedAll((second ?? first).items), this.periodEnd());
    }
    const details = params.subscription_details!;
    const to = this.withItemParams(details.items as Stripe.SubscriptionUpdateParams.Item[]);
    if (details.proration_behavior === "always_invoice") return this.prorationInvoice(to, details.proration_date ?? this.clock);
    return this.renewalInvoice(to, this.periodEnd());
  }

  /** Moves the clock, renewing (and applying schedule phases or a cancel) at each period end on the way. */
  advanceTo(time: number) {
    while (this.status !== "canceled" && this.periodEnd() <= time) {
      const boundary = this.periodEnd();
      this.clock = boundary;
      if (this.cancelAtPeriodEnd || endsPlan(this.schedule, boundary)) {
        this.status = "canceled";
        break;
      }
      if (this.status === "trialing") this.status = "active";
      const phase = this.schedule?.status === "active" ? this.schedule.phases.find((p) => p.start === boundary) : undefined;
      if (phase) this.setItems(phase.items);
      if (this.schedule?.status === "active" && !this.schedule.phases.some((p) => p.end > boundary)) {
        this.schedule.status = "released";
      }
      const next = monthAfter(boundary);
      this.items = this.items.map((i) => ({ ...i, start: boundary, end: next }));
      const renewal = this.renewalInvoice(this.specs(), boundary);
      this.invoices.push({ ...renewal, status: "paid", amount_paid: renewal.amount_due });
    }
    this.clock = time;
  }
}
