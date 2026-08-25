import type { Metadata } from "next";
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const BRAND_ICON =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/ICON.png";
const LOGO_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://customers.direct";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Customers.Direct — AI sends customers directly to your business",
    template: "%s | Customers.Direct",
  },
  description:
    "Customers.Direct helps AI recommend your business to buyers — measuring AI search visibility, answering every call, starting DM conversations, and converting website visitors into customers.",
  icons: {
    icon: BRAND_ICON,
    shortcut: BRAND_ICON,
    apple: BRAND_ICON,
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: siteUrl,
    title: "Customers.Direct — AI sends customers directly to your business",
    description:
      "Customers.Direct helps AI recommend your business to buyers — measuring AI search visibility, answering every call, starting DM conversations, and converting website visitors.",
    images: [
      {
        url: LOGO_URL,
        width: 800,
        height: 200,
        alt: "Customers.Direct",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Customers.Direct — AI sends customers directly to your business",
    description:
      "Customers.Direct helps AI recommend your business to buyers — measuring AI visibility, answering every call, starting conversations, and converting visitors.",
    images: [BRAND_ICON],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Customers.Direct",
  url: siteUrl,
  logo: LOGO_URL,
  description:
    "Customers.Direct helps AI send customers directly to your business — AI Search Visibility, AI Employee, DM Ads, and Call Bar.",
  sameAs: [
    "https://www.instagram.com/customersdirect",
    "https://www.facebook.com/profile.php?id=61592851422075",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
