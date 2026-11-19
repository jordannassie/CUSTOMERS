import ForgotPasswordForm from "@/components/geo/ForgotPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <ForgotPasswordForm />
    </div>
  );
}
