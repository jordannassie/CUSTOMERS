import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Customers.Direct",
  description: "Customers.Direct — your customer platform, powered by Supabase.",
  icons: {
    icon: "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Preload the first home hero banner before React hydrates */}
      <head>
        {/* Slide 1 — shown immediately on load */}
        <link
          rel="preload"
          as="image"
          href="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/DM/ChatGPT%20Image%20Aug%2012,%202026,%2002_03_22%20PM%20(6).png"
        />
        {/* AI homepage video */}
        <link
          rel="preload"
          as="video"
          href="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/aliens/0812%20(1).mov"
          type="video/mp4"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
