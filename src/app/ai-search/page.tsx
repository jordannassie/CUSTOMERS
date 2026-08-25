import AISearchLandingPage from "@/components/geo/AISearchLandingPage";

const title = "AI Search Visibility — Customers.Direct helps AI send customers directly to your business";
const description =
  "Measure, diagnose, and improve how often ChatGPT, Claude, Perplexity, and Google AI Overviews mention your business. Real buyer-intent prompts, real evidence, no fake guarantees.";

export const metadata = {
  title,
  description,
  alternates: {
    canonical: "/ai-search",
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: "https://customers.direct/ai-search",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function AISearchPage() {
  return <AISearchLandingPage />;
}
