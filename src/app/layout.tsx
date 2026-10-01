import type { Metadata } from "next";
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_NAME, SITE_URL } from "@/lib/site-metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const defaultTitle = "Customers.Direct: see if AI recommends your business";
const description =
  "Check whether ChatGPT, Claude and Perplexity recommend your business for the questions local customers ask, see why competitors win, and get steps to fix it.";

// Link preview images come from opengraph-image.tsx and the favicon from icon.tsx.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: defaultTitle, template: `%s | ${SITE_NAME}` },
  description,
  openGraph: { type: "website", siteName: SITE_NAME, url: "/", title: defaultTitle, description },
  twitter: { card: "summary_large_image", title: defaultTitle, description },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/images/logos/logo-black.png`,
  description,
  sameAs: [
    "https://www.instagram.com/customersdirect",
    "https://www.facebook.com/profile.php?id=61592851422075",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // globals.css sets smooth scrolling; this keeps route changes jumping straight to the top (Next 16).
      data-scroll-behavior="smooth"
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
