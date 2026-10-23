import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AuthFormSkeleton from "@/components/geo/AuthFormSkeleton";
import ResetPasswordForm from "@/components/geo/ResetPasswordForm";
import { hasRecentRecoverySession } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false },
};

// Only a session from a reset link opened in the last hour may set a password here without the old one.
// Anyone else (signed out, or signed in some other way) asks for a new link; Settings changes a known password.
async function RecoveryOnlyForm() {
  if (!(await hasRecentRecoverySession())) redirect("/forgot-password");
  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <Suspense fallback={<AuthFormSkeleton />}>
        <RecoveryOnlyForm />
      </Suspense>
    </div>
  );
}
