import { Suspense } from "react";
import AuthForm from "@/components/geo/AuthForm";
import AuthFormSkeleton from "@/components/geo/AuthFormSkeleton";
import { VisibilityExample } from "@/components/marketing/home/VisibilityExample";

export const metadata = {
  title: "Log in",
  robots: { index: false },
};

type SearchParams = Promise<{ error?: string; reason?: string }>;

// Only the form waits for ?error= and ?reason=, so the rest of the page stays in the static shell (Cache Components).
async function FormWithError({ searchParams }: { searchParams: SearchParams }) {
  const { error, reason } = await searchParams;
  const notice =
    reason === "expired"
      ? "You were logged out. Log in again to go back to your page."
      : error === "signup_confirmed"
        ? "Your email is confirmed. Log in to continue."
        : undefined;
  // Only Google sign-in failures go to the form as an error; the confirmation link ones have their own wording.
  const signupLinkInvalid = error === "signup_link_invalid";
  return (
    <AuthForm
      defaultMode="login"
      errorParam={error === "signup_confirmed" || signupLinkInvalid ? undefined : error}
      notice={notice}
      linkError={signupLinkInvalid ? "This confirmation link has expired or was already used. Log in, or sign up again for a new link." : undefined}
    />
  );
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="flex w-full max-w-6xl flex-col items-center gap-8 lg:flex-row lg:gap-16">
        <div className="mx-auto w-full lg:mx-0 lg:w-[420px]">
          <Suspense fallback={<AuthFormSkeleton />}>
            <FormWithError searchParams={searchParams} />
          </Suspense>
        </div>

        {/* A product visual from our own UI, not a photo (UI-007). Wide screens only. */}
        <div className="hidden flex-1 items-center justify-center lg:flex" aria-hidden="true">
          <div className="w-full max-w-[460px]">
            <VisibilityExample />
          </div>
        </div>
      </div>
    </div>
  );
}
