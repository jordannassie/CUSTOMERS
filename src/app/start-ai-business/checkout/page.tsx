import type { Metadata } from "next";
import LaunchKitCheckoutClient from "@/components/launch-kit/LaunchKitCheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function LaunchKitCheckoutPage() {
  return <LaunchKitCheckoutClient />;
}
