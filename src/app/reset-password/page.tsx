import ResetPasswordForm from "@/components/geo/ResetPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set New Password — Customers.Direct",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 py-16">
      <ResetPasswordForm />
    </div>
  );
}
