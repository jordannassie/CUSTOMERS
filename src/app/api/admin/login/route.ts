import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  let body: { pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.pin || body.pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const session = await getAdminSession();
  session.isAdmin = true;
  await session.save();

  return NextResponse.json({ success: true });
}
