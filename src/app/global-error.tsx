"use client";

import "./globals.css";
import { Figtree, Plus_Jakarta_Sans } from "next/font/google";
import { CrashPage } from "@/components/site/CrashPage";

const figtree = Figtree({ variable: "--font-figtree", weight: ["400", "500", "600", "700"], subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", weight: ["500", "600", "700"], subsets: ["latin"] });

// Replaces the root layout when it fails, so it brings its own document, styles and fonts.
export default function GlobalError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className={`${figtree.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <title>Something went wrong | Customers.Direct</title>
        <CrashPage {...props} />
      </body>
    </html>
  );
}
