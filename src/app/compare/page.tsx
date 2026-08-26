import { Suspense } from "react";
import type { Metadata } from "next";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare AI Visibility — Customers.Direct",
  description:
    "See who AI recommends — you or your competitor. Free AI visibility comparison tool.",
};

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#0866F5] border-t-transparent animate-spin" />
      </div>
    }>
      <CompareClient />
    </Suspense>
  );
}
