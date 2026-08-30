/**
 * GET /api/stripe/invoices
 *
 * Returns the authenticated user's recent Stripe invoices.
 * Derives Stripe customer from server-side billing_account only.
 * Never accepts client-supplied customer IDs.
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { requireStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let stripeClient: ReturnType<typeof requireStripe>;
  try {
    stripeClient = requireStripe();
  } catch {
    return NextResponse.json({ invoices: [] });
  }

  const svc = createServiceClient();
  const { data: ba } = await svc
    .from("billing_accounts")
    .select("stripe_customer_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!ba?.stripe_customer_id) {
    return NextResponse.json({ invoices: [] });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 12);

  const invoiceList = await stripeClient.invoices.list({
    customer: ba.stripe_customer_id,
    limit: Math.min(limit, 24),
  });

  const invoices = invoiceList.data.map((inv) => ({
    id: inv.id,
    number: inv.number,
    status: inv.status,
    amountPaid: inv.amount_paid,
    amountDue: inv.amount_due,
    currency: inv.currency,
    created: inv.created,
    periodStart: inv.period_start,
    periodEnd: inv.period_end,
    hostedInvoiceUrl: inv.hosted_invoice_url,
    invoicePdf: inv.invoice_pdf,
    description: inv.description,
  }));

  return NextResponse.json({ invoices });
}
