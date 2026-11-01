import { readUnsubscribeToken, unsubscribeAgency } from "@/modules/email";

// Public on purpose: the signed token is the only proof needed (B-61). Serves both the confirm
// button on /email/unsubscribe and mail apps' one-click unsubscribe (RFC 8058), which POST here.

/**
 * The List-Unsubscribe header points here too, and a mail app without one-click support opens it in a browser. A
 * visit never unsubscribes by itself (link scanners open every link): it goes to the page with the confirm button.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = new URL("/email/unsubscribe", url);
  const token = url.searchParams.get("token");
  if (token) page.searchParams.set("token", token.slice(0, 500));
  return Response.redirect(page, 303);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const target = readUnsubscribeToken(form?.get("token") ?? url.searchParams.get("token"));
  if (!target) return Response.json({ error: "This unsubscribe link is not valid." }, { status: 400 });

  await unsubscribeAgency(target.agencyId, target.topic);

  // Mail apps send List-Unsubscribe=One-Click and only need a 2xx; people go back to the page.
  if (form?.get("List-Unsubscribe") === "One-Click") return new Response(null, { status: 200 });
  const done = new URL("/email/unsubscribe", url);
  done.searchParams.set("token", String(form?.get("token") ?? url.searchParams.get("token")));
  done.searchParams.set("done", "1");
  return Response.redirect(done, 303);
}
