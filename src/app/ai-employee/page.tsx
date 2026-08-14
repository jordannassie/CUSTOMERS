import AIEmployeeExperience from "@/components/ai/AIEmployeeExperience";

const title = "Customers Direct AI Employee — Never Miss Another Customer";
const description =
  "Every call gets answered. Your AI Employee works alongside your staff, keeps your existing business number, handles after-hours and overflow calls, qualifies leads, and helps book the next step.";
const image =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/AIPHONE/ChatGPT%20Image%20Aug%2012,%202026,%2002_02_33%20PM%20(7).png";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/ai-employee" },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: "https://customers.direct/ai-employee",
    title,
    description,
    images: [{ url: image }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [image],
  },
};

export default function AIEmployeePage() {
  return <AIEmployeeExperience />;
}
