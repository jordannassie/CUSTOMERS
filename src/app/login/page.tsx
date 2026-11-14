import { Suspense } from "react";
import AuthForm from "@/components/geo/AuthForm";
import AuthFormSkeleton from "@/components/geo/AuthFormSkeleton";
import { AuthPageShell } from "@/components/geo/AuthPageShell";

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
    <AuthPageShell>
      <Suspense fallback={<AuthFormSkeleton />}>
        <FormWithError searchParams={searchParams} />
      </Suspense>
    </AuthPageShell>
  );
}
