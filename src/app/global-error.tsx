"use client";

import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { CrashPage } from "@/components/site/CrashPage";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Replaces the root layout when it fails, so it brings its own document, styles and fonts.
export default function GlobalError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <title>Something went wrong | Customers.Direct</title>
        <CrashPage {...props} />
      </body>
    </html>
  );
}
