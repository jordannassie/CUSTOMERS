import type { Metadata } from "next";
import { NotFoundPage } from "@/components/site/NotFoundPage";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return <NotFoundPage />;
}
