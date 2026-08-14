import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const BRAND_ICON =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/ICON.png";

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
    default: "Customers Direct AI Employee — Never Miss Another Customer",
    template: "%s | Customers.Direct",
  },
  description:
    "Every call gets answered. Your AI Employee works alongside your staff, keeps your existing business number, and handles after-hours and overflow calls.",
  icons: {
    icon: BRAND_ICON,
    shortcut: BRAND_ICON,
    apple: BRAND_ICON,
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: siteUrl,
    title: "Customers Direct AI Employee — Never Miss Another Customer",
    description:
      "Every call gets answered. Your AI Employee works alongside your staff, keeps your existing business number, and handles after-hours and overflow calls.",
    images: [
      {
        url: BRAND_ICON,
        width: 1024,
        height: 1024,
        alt: "Customers.Direct",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Customers Direct AI Employee — Never Miss Another Customer",
    description: "Every call gets answered with your Customers Direct AI Employee.",
    images: [BRAND_ICON],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Customers.Direct",
  url: siteUrl,
  logo: logoUrl,
  description: "AI Employee and customer acquisition solutions for growing businesses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preload"
          as="image"
          href="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/AIPHONE/ChatGPT%20Image%20Aug%2012,%202026,%2002_02_33%20PM%20(7).png"
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
