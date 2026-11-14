import { Suspense } from "react";
import AuthForm from "@/components/geo/AuthForm";
import AuthFormSkeleton from "@/components/geo/AuthFormSkeleton";
import { AuthPageShell } from "@/components/geo/AuthPageShell";

export const metadata = {
  title: "Sign up",
  robots: { index: false },
};

type SearchParams = Promise<{ error?: string }>;

// Only the form waits for ?error=, so the rest of the page stays in the static shell (Cache Components).
async function FormWithError({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  return <AuthForm defaultMode="signup" errorParam={error} />;
}

export default function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthPageShell>
      <Suspense fallback={<AuthFormSkeleton />}>
        <FormWithError searchParams={searchParams} />
      </Suspense>
    </AuthPageShell>
  );
}
