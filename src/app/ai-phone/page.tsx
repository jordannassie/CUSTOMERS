import AIEmployeeExperience from "@/components/ai/AIEmployeeExperience";

const aiEmployeeTitle = "Customers Direct AI Employee — Never Miss Another Customer";
const aiEmployeeDescription =
  "Every call gets answered. Your AI Employee works alongside your staff, keeps your existing business number, handles after-hours and overflow calls, qualifies leads, and helps book the next step.";
const aiEmployeeImage =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/AIPHONE/ChatGPT%20Image%20Aug%2012,%202026,%2002_02_33%20PM%20(7).png";

export const metadata = {
  title: aiEmployeeTitle,
  description: aiEmployeeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: "https://customers.direct/",
    title: aiEmployeeTitle,
    description: aiEmployeeDescription,
    images: [{ url: aiEmployeeImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: aiEmployeeTitle,
    description: aiEmployeeDescription,
    images: [aiEmployeeImage],
  },
};

export default function AIPhonePage() {
  return <AIEmployeeExperience />;
}
