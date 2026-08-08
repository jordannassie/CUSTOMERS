import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

export async function POST() {
  const session = await getAdminSession();
  session.isAdmin = undefined;
  await session.save();
  return NextResponse.json({ success: true });
}
