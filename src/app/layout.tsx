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
      {/* Preload hero banner slide 1 + video before React hydrates */}
      <head>
        {/* Slide 1 — shown immediately on load */}
        <link
          rel="preload"
          as="image"
          href="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/aliens/9859418e-4aaa-457f-8cc3-e841889b625e.png"
        />
        {/* Video */}
        <link
          rel="preload"
          as="video"
          href="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/aliens/AlienHorizontal.mp4"
          type="video/mp4"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
