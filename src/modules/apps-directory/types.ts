export const APP_CATEGORIES = [
  { id: "ai-tools", label: "AI Tools" },
  { id: "ai-search", label: "AI Search (AEO)" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Sales" },
  { id: "crm", label: "CRM" },
  { id: "content-design", label: "Content & Design" },
  { id: "automation", label: "Automation" },
  { id: "productivity", label: "Productivity" },
  { id: "customer-service", label: "Customer Service" },
  { id: "development", label: "Development" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "security", label: "Security" },
] as const;

export type AppCategoryId = (typeof APP_CATEGORIES)[number]["id"];

export type ReviewSource = "g2" | "capterra";

export type DirectoryApp = {
  slug: string;
  name: string;
  provider: string;
  description: string;
  websiteUrl: string;
  affiliateUrl: string | null;
  categories: AppCategoryId[];
  featured: boolean;
  popular: boolean;
  topPick: boolean;
  active: boolean;
  reviewSource: ReviewSource | null;
  reviewUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  ratingScale: number;
  ratingLastUpdated: string | null;
};

export type AppSort = "name" | "provider";

export type AppSource = "homepage" | "directory" | "detail";

export function categoryLabel(id: string): string {
  return APP_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

export function isCategoryId(value: string): value is AppCategoryId {
  return APP_CATEGORIES.some((category) => category.id === value);
}
