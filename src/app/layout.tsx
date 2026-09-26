import type { Metadata } from "next";
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const BRAND_ICON =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/logos/Customerdirectlogo.jpg";
const LOGO_URL =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/people/heroimage.png";

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
    default: "Customers.Direct: AI sends customers directly to your business",
    template: "%s | Customers.Direct",
  },
  description:
    "Customers.Direct checks whether ChatGPT, Claude and Perplexity recommend your business, shows why competitors win, and gives you steps to fix it.",
  icons: {
    icon: BRAND_ICON,
    shortcut: BRAND_ICON,
    apple: BRAND_ICON,
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: siteUrl,
    title: "Customers.Direct: AI sends customers directly to your business",
    description:
      "Customers.Direct checks whether ChatGPT, Claude and Perplexity recommend your business, shows why competitors win, and gives you steps to fix it.",
    images: [
      {
        url: LOGO_URL,
        width: 1200,
        height: 630,
        alt: "Customers.Direct: AI sends customers directly to your business",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Customers.Direct: AI sends customers directly to your business",
    description:
      "Customers.Direct checks whether ChatGPT, Claude and Perplexity recommend your business, shows why competitors win, and gives you steps to fix it.",
    images: [LOGO_URL],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Customers.Direct",
  url: siteUrl,
  logo: LOGO_URL,
  description:
    "Customers.Direct checks whether ChatGPT, Claude and Perplexity recommend your business, shows why competitors win, and gives you steps to fix it.",
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
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
