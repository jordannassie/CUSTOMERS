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

const siteUrl = "https://customers.direct";
const logoUrl =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Customers.Direct — Get More Customers. Never Miss Another One.",
    template: "%s | Customers.Direct",
  },
  description:
    "Customer Acquisition + AI Receptionist for growing businesses. We help you create more customer opportunities and make sure you're there when customers respond.",
  icons: {
    icon: logoUrl,
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: siteUrl,
    title: "Customers.Direct — Get More Customers. Never Miss Another One.",
    description:
      "Customer Acquisition + AI Receptionist for growing businesses. We help you create more customer opportunities and make sure you're there when customers respond.",
    images: [{ url: logoUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Customers.Direct — Get More Customers. Never Miss Another One.",
    description: "Customer Acquisition + AI Receptionist for growing businesses.",
    images: [logoUrl],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Customers.Direct",
  url: siteUrl,
  logo: logoUrl,
  description: "Customer Acquisition + AI Receptionist for growing businesses.",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
