import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface AdminSessionData {
  isAdmin?: boolean;
}

export const sessionOptions = {
  password: process.env.ADMIN_SESSION_SECRET!,
  cookieName: "cd_admin_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getAdminSession() {
  const cookieStore = await cookies();
  return getIronSession<AdminSessionData>(cookieStore, sessionOptions);
}
