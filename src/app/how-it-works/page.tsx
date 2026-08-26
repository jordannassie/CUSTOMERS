import { redirect } from "next/navigation";

export const metadata = {
  title: "How It Works — Customers.Direct",
  robots: { index: false },
};

export default function HowItWorksPage() {
  redirect("/#how-it-works");
}
