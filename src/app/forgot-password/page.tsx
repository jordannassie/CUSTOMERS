import ForgotPasswordForm from "@/components/geo/ForgotPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password — Customers.Direct",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 py-16">
      <ForgotPasswordForm />
    </div>
  );
}
