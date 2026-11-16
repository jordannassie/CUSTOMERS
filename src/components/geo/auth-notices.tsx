import Link from "next/link";
import type { LoginNotice } from "@/modules/auth/callback";
import { AuthAlert } from "./auth-bits";

type GoogleNotice = Extract<LoginNotice, { kind: "google" }>;
type MessageNotice = Extract<LoginNotice, { kind: "message" }>;

/** The Google sign-in problem and the confirmation-link notice above the log in form (split from AuthForm, 2026-11-16). */
export function AuthNotices({ google, linkNotice, onRetryGoogle }: { google: GoogleNotice | null; linkNotice: MessageNotice | null; onRetryGoogle: () => void }) {
  return (
    <>
    {google && (
      <div className="mb-4">
        <AuthAlert tone="warning">
          <p className="font-semibold">{google.title}</p>
          <p className="mt-1">
            {google.text}{" "}
            <button type="button" onClick={onRetryGoogle} className="font-semibold underline hover:no-underline">
              Retry with Google
            </button>{" "}
            or{" "}
            <Link href="/contact?topic=support" prefetch={false} className="font-semibold underline hover:no-underline">
              contact support
            </Link>.
          </p>
        </AuthAlert>
      </div>
    )}
    {linkNotice && (
      <div className="mb-4">
        <AuthAlert tone={linkNotice.tone}>
          {linkNotice.text}
          {linkNotice.link && (
            <>
              {" "}
              <Link href={linkNotice.link.href} prefetch={false} className="font-semibold underline hover:no-underline">
                {linkNotice.link.label}
              </Link>
            </>
          )}
        </AuthAlert>
      </div>
    )}
    </>
  );
}
