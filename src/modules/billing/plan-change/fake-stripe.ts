import type Stripe from "stripe";
import { invoice, line } from "../stripe-objects";
import type { PlanChangeStripe } from "./client";
import type { ItemSpec } from "./planner";
import {
  monthAfter,
  PRICES,
  prorationLines,
  scheduleObject,
  subscriptionObject,
  type FakeSchedule,
  type Item,
  type Phase,
  type PriceTable,
} from "./fake-stripe-objects";

export { at, PRICES, type PriceTable } from "./fake-stripe-objects";

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
    this.prices = opts.prices ?? PRICES;
    this.subscriptionId = opts.ids?.subscription ?? "sub_fake";
    this.customerId = opts.ids?.customer ?? "cus_fake";
    this.agencyId = opts.ids?.agency ?? null;
    this.status = opts.status ?? "active";
    const end = opts.periodEnd ?? monthAfter(opts.periodStart);
    if (this.status === "trialing") this.trialEnd = end;
    this.items = opts.items.map((i) => ({
      id: i.itemId ?? `si_${i.businessId}`,
      price: i.price,
      quantity: 1,
      metadata: { business_id: i.businessId },
      start: opts.periodStart,
      end,
    }));
  }

  private id = (prefix: string) => `${prefix}_fake${this.nextId++}`;

  subscription(): Stripe.Subscription {
    return subscriptionObject(this);
  }

  scheduleObject(): Stripe.SubscriptionSchedule {
    return scheduleObject(this.schedule!, this.clock);
  }

  private once<T>(key: string, run: () => T): T {
    if (this.seen.has(key)) return this.seen.get(key) as T;
    const result = run();
    this.seen.set(key, result);
    return result;
  }

  private periodEnd = () => Math.min(...this.items.map((i) => i.end));
  private periodStart = () => Math.min(...this.items.map((i) => i.start));

  private specs = (): ItemSpec[] => this.items.map((i) => ({ price: i.price, quantity: i.quantity, metadata: { ...i.metadata } }));

  private renewalInvoice(items: ItemSpec[], start: number): Stripe.Invoice {
    const end = monthAfter(start);
    return invoice({
      customer: this.customerId,
      subscriptionId: this.subscriptionId,
      billingReason: "subscription_cycle",
      lines: items.map((i) =>
        line({ product: this.prices[i.price].product, amount: this.prices[i.price].unitAmount, subscriptionId: this.subscriptionId, start, end }),
      ),
      status: "open",
    });
  }

  private prorationInvoice(to: ItemSpec[], date: number): Stripe.Invoice {
    const lines = this.status === "trialing" ? [] : prorationLines(this, this.specs(), to, date);
    return invoice({ customer: this.customerId, subscriptionId: this.subscriptionId, billingReason: "subscription_update", lines, status: "open" });
  }

  /** Moves the subscription to `to` now, charging the proration like payment_behavior error_if_incomplete. */
  private changeNow(to: ItemSpec[], date: number) {
    const bill = this.prorationInvoice(to, date);
    if (bill.amount_due > 0 && this.declineNextCharge) {
      this.declineNextCharge = false;
      throw Object.assign(new Error("Your card was declined."), { type: "StripeCardError", statusCode: 402 });
    }
    if (bill.lines.data.length > 0) this.invoices.push({ ...bill, status: "paid", amount_paid: bill.amount_due });
    this.setItems(to);
  }

  private setItems(to: ItemSpec[]) {
    const start = this.periodStart();
    const end = this.periodEnd();
    this.items = to.map((spec) => {
      const existing = this.items.find((i) => i.metadata.business_id === spec.metadata.business_id);
      return { id: existing?.id ?? this.id("si"), ...spec, metadata: { ...spec.metadata }, start, end };
    });
  }

  private withItemParams(params: Stripe.SubscriptionUpdateParams.Item[]): ItemSpec[] {
    let specs = this.specs();
    for (const p of params) {
      const target = this.items.find((i) => i.id === p.id);
      if (p.deleted) specs = specs.filter((s) => s.metadata.business_id !== target?.metadata.business_id);
      else if (target) specs = specs.map((s) => (s.metadata.business_id === target.metadata.business_id ? { ...s, price: p.price! } : s));
      else specs.push({ price: p.price!, quantity: p.quantity ?? 1, metadata: { ...(p.metadata as Record<string, string>) } });
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
      const current: Phase = { start: first.start_date as number, end: first.end_date as number, items: first.items as ItemSpec[] };
      const phases = [current];
      if (second) phases.push({ start: current.end, end: monthAfter(current.end), items: second.items as ItemSpec[] });
      if (params.proration_behavior === "always_invoice") this.changeNow(current.items, this.clock);
      this.schedule = { ...this.schedule!, phases, endBehavior: params.end_behavior ?? this.schedule!.endBehavior };
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

  async updateSubscription(_id: string, params: Stripe.SubscriptionUpdateParams, key: string) {
    this.calls.push({ method: "updateSubscription", params, key });
    return this.once(key, () => {
      if (params.cancel_at_period_end !== undefined) this.cancelAtPeriodEnd = params.cancel_at_period_end;
      if (params.items) this.changeNow(this.withItemParams(params.items), params.proration_date ?? this.clock);
      return this.subscription();
    });
  }

  async previewInvoice(params: Stripe.InvoiceCreatePreviewParams) {
    this.calls.push({ method: "previewInvoice", params });
    if (!params.schedule_details && !params.subscription_details) {
      // The upcoming renewal: the next phase's items when a change is pending.
      const next = this.schedule?.status === "active" ? this.schedule.phases.find((p) => p.start >= this.periodEnd()) : undefined;
      return this.renewalInvoice(next?.items ?? this.specs(), this.periodEnd());
    }
    if (params.schedule_details) {
      const [first, second] = params.schedule_details.phases!;
      if (params.schedule_details.proration_behavior === "always_invoice") {
        return this.prorationInvoice(first.items as ItemSpec[], this.clock);
      }
      return this.renewalInvoice((second ?? first).items as ItemSpec[], this.periodEnd());
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
      if (this.cancelAtPeriodEnd) {
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
      this.invoices.push({ ...this.renewalInvoice(this.specs(), boundary), status: "paid" });
    }
    this.clock = time;
  }
}
