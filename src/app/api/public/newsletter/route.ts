import { NextResponse } from "next/server";
import { z } from "zod";
import { recordNewsletterEvent } from "@/modules/newsletter/dal";
import { PLACEMENTS } from "@/modules/newsletter/signup";

const impressionSchema = z.object({
  event: z.enum(["impression", "confirmed"]),
  placement: z.enum(PLACEMENTS),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = impressionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await recordNewsletterEvent(parsed.data);
  return NextResponse.json({ ok: true });
}
