import type Stripe from "stripe";
import { invoice, line } from "../webhooks/fixtures.test-helpers";
import type { PlanChangeStripe } from "./client";
import type { ItemSpec } from "./planner";

// An in-memory Stripe for plan change tests, standing in for a Stripe test clock: one subscription, its schedule,
// prorations, renewals and invoices, with a clock the test moves. It follows Stripe's documented behavior; the
// real test-clock run is still to do once the sandbox exists (B-01, B-40).

export const PRICES: Record<string, { product: string; unitAmount: number }> = {
  price_starter: { product: "cd_plan_starter", unitAmount: 14900 },
  price_pro: { product: "cd_plan_pro", unitAmount: 24900 },
};

type Item = { id: string; price: string; quantity: number; metadata: Record<string, string>; start: number; end: number };
type Phase = { start: number; end: number; items: ItemSpec[] };

export const at = (iso: string) => Math.floor(Date.parse(iso) / 1000);

function monthAfter(seconds: number): number {
  const d = new Date(seconds * 1000);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) / 1000);
}

export class FakeStripe implements PlanChangeStripe {
  clock: number;
  status: Stripe.Subscription.Status;
  trialEnd: number | null = null;
  cancelAtPeriodEnd = false;
  items: Item[] = [];
  schedule: { id: string; status: Stripe.SubscriptionSchedule.Status; phases: Phase[]; endBehavior: string } | null = null;
  invoices: Stripe.Invoice[] = [];
  calls: { method: string; params?: unknown; key?: string }[] = [];
  declineNextCharge = false;
  private seen = new Map<string, unknown>();
  private nextId = 1;

  constructor(opts: { now: number; status?: Stripe.Subscription.Status; periodStart: number; items: { businessId: string; price: string }[] }) {
    this.clock = opts.now;
    this.status = opts.status ?? "active";
    const end = monthAfter(opts.periodStart);
    if (this.status === "trialing") this.trialEnd = end;
    this.items = opts.items.map((i) => ({
      id: `si_${i.businessId}`,
      price: i.price,
      quantity: 1,
      metadata: { business_id: i.businessId },
      start: opts.periodStart,
      end,
    }));
  }

  readonly subscriptionId = "sub_fake";
  private id = (prefix: string) => `${prefix}_fake${this.nextId++}`;

  subscription(): Stripe.Subscription {
    return {
      id: this.subscriptionId,
      object: "subscription",
      customer: "cus_fake",
      status: this.status,
      trial_end: this.trialEnd,
      cancel_at_period_end: this.cancelAtPeriodEnd,
      schedule: this.schedule && this.schedule.status === "active" ? this.schedule.id : null,
      metadata: {},
      items: {
        object: "list",
        has_more: false,
        url: "",
        data: this.items.map((i) => ({
          id: i.id,
          object: "subscription_item",
          price: { id: i.price, product: PRICES[i.price].product, unit_amount: PRICES[i.price].unitAmount },
          quantity: i.quantity,
          metadata: { ...i.metadata },
          current_period_start: i.start,
          current_period_end: i.end,
        })),
      },
    } as unknown as Stripe.Subscription;
  }

  scheduleObject(): Stripe.SubscriptionSchedule {
    const s = this.schedule!;
    const current = s.phases.find((p) => p.start <= this.clock && this.clock < p.end) ?? s.phases[0];
    return {
      id: s.id,
      object: "subscription_schedule",
      status: s.status,
      end_behavior: s.endBehavior,
      current_phase: { start_date: current.start, end_date: current.end },
      phases: s.phases.map((p) => ({
        start_date: p.start,
        end_date: p.end,
        items: p.items.map((i) => ({ price: i.price, quantity: i.quantity, metadata: { ...i.metadata } })),
      })),
    } as unknown as Stripe.SubscriptionSchedule;
  }

  private once<T>(key: string, run: () => T): T {
    if (this.seen.has(key)) return this.seen.get(key) as T;
    const result = run();
    this.seen.set(key, result);
    return result;
  }

  private periodEnd = () => Math.min(...this.items.map((i) => i.end));
  private periodStart = () => Math.min(...this.items.map((i) => i.start));

  /** Proration lines for moving from `from` to `to` at `date`: credit for unused time, charge for the rest. */
  private prorationLines(from: ItemSpec[], to: ItemSpec[], date: number): Stripe.InvoiceLineItem[] {
    const start = this.periodStart();
    const end = this.periodEnd();
    const fraction = (end - date) / (end - start);
    const lines: Stripe.InvoiceLineItem[] = [];
    const key = (i: ItemSpec) => i.metadata.business_id;
    const push = (spec: ItemSpec, sign: 1 | -1, itemId: string) =>
      lines.push(
        line({
          product: PRICES[spec.price].product,
          amount: sign * Math.round(PRICES[spec.price].unitAmount * fraction),
          proration: true,
          itemId,
          subscriptionId: this.subscriptionId,
          start: date,
          end,
        }),
      );
    for (const next of to) {
      const before = from.find((f) => key(f) === key(next));
      const itemId = this.items.find((i) => i.metadata.business_id === key(next))?.id ?? `si_${key(next)}`;
      if (before && before.price === next.price) continue;
      if (before) push(before, -1, itemId);
      push(next, 1, itemId);
    }
    return lines;
  }

  private specs = (): ItemSpec[] => this.items.map((i) => ({ price: i.price, quantity: i.quantity, metadata: { ...i.metadata } }));

  private renewalInvoice(items: ItemSpec[], start: number): Stripe.Invoice {
    const end = monthAfter(start);
    return invoice({
      customer: "cus_fake",
      subscriptionId: this.subscriptionId,
      billingReason: "subscription_cycle",
      lines: items.map((i) =>
        line({ product: PRICES[i.price].product, amount: PRICES[i.price].unitAmount, subscriptionId: this.subscriptionId, start, end }),
      ),
      status: "open",
    });
  }

  private prorationInvoice(to: ItemSpec[], date: number): Stripe.Invoice {
    const lines = this.status === "trialing" ? [] : this.prorationLines(this.specs(), to, date);
    return invoice({ customer: "cus_fake", subscriptionId: this.subscriptionId, billingReason: "subscription_update", lines, status: "open" });
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
