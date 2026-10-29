import { NextRequest, NextResponse } from "next/server";
import { contactInput, contactProblem, contactTopic, hashIp, saveContactMessage } from "@/modules/feedback";
import { checkRateLimit, clientIp } from "@/modules/rate-limit";
import { CONTACT_EMAIL } from "@/components/legal/LegalPage";

// The same address the legal pages and /contact show, so "email us" always says where.
const EMAIL_US = `email us at ${CONTACT_EMAIL}`;

// Public contact form: rate limited per address; checks and the write live in the feedback module.
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  const limit = await checkRateLimit("contact", ip);
  if (limit === "limited") {
    return NextResponse.json(
      { error: `You've sent a few messages already. Try again in an hour, or ${EMAIL_US}.` },
      { status: 429 },
    );
  }
  if (limit === "unavailable") {
    return NextResponse.json({ error: `We couldn't send your message right now. Try again in a few minutes, or ${EMAIL_US}.` }, { status: 503 });
  }

  const parsed = contactInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Something was wrong with that request. Refresh the page and try again." }, { status: 400 });
  }
  const input = parsed.data;
  // Honeypot: bots fill the hidden field; they are told it worked.
  if (input._honey && String(input._honey).trim() !== "") return NextResponse.json({ success: true });

  const problem = contactProblem(input);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const saved = await saveContactMessage({ ...input, topic: contactTopic(input.interest, input.topic), ipHash: hashIp(ip) });
  if (!saved.ok) {
    return NextResponse.json({ error: `We couldn't send your message. Try again, or ${EMAIL_US}.` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
