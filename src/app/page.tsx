import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import HomepagePlatform from "@/components/site/HomepagePlatform";
import ChatWidget from "@/components/ChatWidget";
import { listNativeSummaries } from "@/modules/apps-directory/review-dal";
import { env } from "@/lib/env";

const homeTitle = "Customers.Direct — AI sends customers directly to your business";
const homeDescription =
  "Customers.Direct helps businesses and agencies measure AI search visibility across ChatGPT, Claude, Perplexity, Gemini, and Google AI — and turn every gap into an actionable fix.";
const homeImage =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png";

export const metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: "https://customers.direct/",
    title: homeTitle,
    description: homeDescription,
    images: [{ url: homeImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: [homeImage],
  },
};

export const revalidate = 300;

export default async function Home() {
  const ratings = await listNativeSummaries();
  return (
    <>
      <SiteHeader />
      <main>
        <HomepagePlatform ratings={ratings} embedSrc={env.NEXT_PUBLIC_BEEHIIV_EMBED_SRC} />
      </main>
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
