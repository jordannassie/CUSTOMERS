import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import PromoBar from "@/components/PromoBar";
import ChatWidget from "@/components/ChatWidget";
import MobileCallBar from "@/components/MobileCallBar";
import HomepagePlatform from "@/components/site/HomepagePlatform";

const homeTitle = "Customers.Direct — AI sends customers directly to your business";
const homeDescription =
  "Customers.Direct helps AI recommend your business to buyers — measuring AI search visibility, answering every call, starting DM conversations, and converting website visitors.";
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

export default function Home() {
  return (
    <>
      <PromoBar />
      <SiteHeader />
      <main>
        <HomepagePlatform />
      </main>
      <SiteFooter />
      <ChatWidget />
      <MobileCallBar />
    </>
  );
}
