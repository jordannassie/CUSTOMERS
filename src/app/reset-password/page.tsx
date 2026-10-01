import ResetPasswordForm from "@/components/geo/ResetPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <ResetPasswordForm />
    </div>
  );
}
