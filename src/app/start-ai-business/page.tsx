import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import LaunchKitHero from "@/components/site/launch-kit/LaunchKitHero";
import LaunchKitWhatYouGet from "@/components/site/launch-kit/LaunchKitWhatYouGet";
import LaunchKitBottom from "@/components/site/launch-kit/LaunchKitBottom";
import { launchKitIntroVideoExists } from "@/components/site/launch-kit/LaunchKitVideo";

const title = "Get the AI Business Launch Kit for $97 | Customers.Direct";
const description =
  "One-time $97 kit with training, scripts, templates, and a first-client plan to help local businesses get found in ChatGPT and AI search.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/start-ai-business" },
  openGraph: {
    type: "website",
    title,
    description,
    url: "https://customers.direct/start-ai-business",
    images: [{ url: "/images/start-ai-business/hero.jpg" }],
  },
};

export default function StartAiBusinessPage() {
  const hasVideo = launchKitIntroVideoExists();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <LaunchKitHero hasVideo={hasVideo} />
        <LaunchKitWhatYouGet />
        <LaunchKitBottom />
      </main>
      <SiteFooter />
    </div>
  );
}
