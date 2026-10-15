import type { AppCategoryId, DirectoryApp } from "./types";

type Seed = {
  slug: string;
  name: string;
  provider: string;
  description: string;
  websiteUrl: string;
  categories: AppCategoryId[];
  featured?: boolean;
  popular?: boolean;
  topPick?: boolean;
};

/** Review pages confirmed from the publisher's own listing. Ratings stay empty until a licensed feed exists. */
const VERIFIED_REVIEWS: Record<string, { reviewSource: "g2" | "capterra"; reviewUrl: string }> = {
  chatgpt: { reviewSource: "g2", reviewUrl: "https://www.g2.com/products/chatgpt/reviews" },
  canva: { reviewSource: "capterra", reviewUrl: "https://www.capterra.com/p/168956/Canva/reviews/" },
  hubspot: { reviewSource: "capterra", reviewUrl: "https://www.capterra.com/p/152373/HubSpot-CRM/reviews/" },
  notion: { reviewSource: "g2", reviewUrl: "https://www.g2.com/products/notion/reviews" },
  perplexity: { reviewSource: "g2", reviewUrl: "https://www.g2.com/products/perplexity/reviews" },
  mailchimp: { reviewSource: "g2", reviewUrl: "https://www.g2.com/products/intuit-mailchimp-email-marketing/reviews" },
  zendesk: { reviewSource: "g2", reviewUrl: "https://www.g2.com/products/zendesk-support-suite/reviews" },
  slack: { reviewSource: "capterra", reviewUrl: "https://www.capterra.com/p/135003/Slack/reviews/" },
};

function app(seed: Seed): DirectoryApp {
  const review = VERIFIED_REVIEWS[seed.slug];
  return {
    affiliateUrl: null,
    active: true,
    featured: false,
    popular: false,
    topPick: false,
    rating: null,
    reviewCount: null,
    ratingScale: 5,
    ratingLastUpdated: null,
    reviewSource: review?.reviewSource ?? null,
    reviewUrl: review?.reviewUrl ?? null,
    ...seed,
  };
}

/** Built-in directory. Admin rows can override or hide these by slug. */
export const DIRECTORY_CATALOG: DirectoryApp[] = [
  app({ slug: "chatgpt", name: "ChatGPT", provider: "OpenAI", description: "Write, research, and answer questions in a conversation.", websiteUrl: "https://chatgpt.com", categories: ["ai-tools", "ai-search", "content-design"], featured: true, popular: true, topPick: true }),
  app({ slug: "canva", name: "Canva", provider: "Canva", description: "Design presentations, social posts, and marketing graphics.", websiteUrl: "https://www.canva.com", categories: ["marketing", "content-design"], featured: true, popular: true }),
  app({ slug: "hubspot", name: "HubSpot", provider: "HubSpot", description: "CRM for contacts, email, and a sales pipeline.", websiteUrl: "https://www.hubspot.com", categories: ["marketing", "sales", "crm"], featured: true, popular: true }),
  app({ slug: "meta-ads", name: "Meta Ads", provider: "Meta", description: "Create and manage ads on Facebook and Instagram.", websiteUrl: "https://www.facebook.com/business/ads", categories: ["marketing"], featured: true }),
  app({ slug: "google-ai", name: "Google AI", provider: "Google", description: "Gemini helps with writing, research, and Google tools.", websiteUrl: "https://gemini.google.com", categories: ["ai-tools", "ai-search"], featured: true, popular: true }),
  app({ slug: "notion", name: "Notion", provider: "Notion", description: "Notes, docs, and project pages in one workspace.", websiteUrl: "https://www.notion.com", categories: ["productivity", "content-design"], featured: true, popular: true }),
  app({ slug: "claude", name: "Claude", provider: "Anthropic", description: "Draft, summarize, and analyze documents in a chat.", websiteUrl: "https://claude.ai", categories: ["ai-tools", "content-design"], popular: true }),
  app({ slug: "perplexity", name: "Perplexity", provider: "Perplexity", description: "Ask questions and get answers with cited sources.", websiteUrl: "https://www.perplexity.ai", categories: ["ai-tools", "ai-search"], popular: true }),
  app({ slug: "copilot", name: "Microsoft Copilot", provider: "Microsoft", description: "An AI assistant inside Microsoft 365 and the browser.", websiteUrl: "https://copilot.microsoft.com", categories: ["ai-tools", "productivity"] }),
  app({ slug: "midjourney", name: "Midjourney", provider: "Midjourney", description: "Create images from written prompts.", websiteUrl: "https://www.midjourney.com", categories: ["ai-tools", "content-design"] }),
  app({ slug: "elevenlabs", name: "ElevenLabs", provider: "ElevenLabs", description: "Generate and edit spoken audio from text.", websiteUrl: "https://elevenlabs.io", categories: ["ai-tools", "content-design"] }),
  app({ slug: "semrush", name: "Semrush", provider: "Semrush", description: "Research keywords, competitors, and search visibility.", websiteUrl: "https://www.semrush.com", categories: ["marketing", "ai-search"] }),
  app({ slug: "google-ads", name: "Google Ads", provider: "Google", description: "Run ads on Google Search, YouTube, and partner sites.", websiteUrl: "https://ads.google.com", categories: ["marketing"] }),
  app({ slug: "mailchimp", name: "Mailchimp", provider: "Intuit", description: "Send email campaigns and manage a contact list.", websiteUrl: "https://mailchimp.com", categories: ["marketing"] }),
  app({ slug: "klaviyo", name: "Klaviyo", provider: "Klaviyo", description: "Email and text campaigns tied to customer activity.", websiteUrl: "https://www.klaviyo.com", categories: ["marketing"] }),
  app({ slug: "buffer", name: "Buffer", provider: "Buffer", description: "Plan and publish posts across social accounts.", websiteUrl: "https://buffer.com", categories: ["marketing", "content-design"] }),
  app({ slug: "webflow", name: "Webflow", provider: "Webflow", description: "Design and publish a website without a separate host.", websiteUrl: "https://webflow.com", categories: ["content-design", "marketing"] }),
  app({ slug: "salesforce", name: "Salesforce", provider: "Salesforce", description: "Track leads, accounts, and deals in a CRM.", websiteUrl: "https://www.salesforce.com", categories: ["sales", "crm"], popular: true }),
  app({ slug: "apollo", name: "Apollo", provider: "Apollo", description: "Find contacts and send sales outreach.", websiteUrl: "https://www.apollo.io", categories: ["sales"] }),
  app({ slug: "pipedrive", name: "Pipedrive", provider: "Pipedrive", description: "A sales pipeline for deals and follow-ups.", websiteUrl: "https://www.pipedrive.com", categories: ["sales", "crm"] }),
  app({ slug: "zoho-crm", name: "Zoho CRM", provider: "Zoho", description: "Store contacts and move deals through stages.", websiteUrl: "https://www.zoho.com/crm/", categories: ["crm", "sales"] }),
  app({ slug: "calendly", name: "Calendly", provider: "Calendly", description: "Let people book a meeting on your calendar.", websiteUrl: "https://calendly.com", categories: ["sales", "productivity"] }),
  app({ slug: "figma", name: "Figma", provider: "Figma", description: "Design interfaces and share them with a team.", websiteUrl: "https://www.figma.com", categories: ["content-design"] }),
  app({ slug: "grammarly", name: "Grammarly", provider: "Grammarly", description: "Check spelling, clarity, and tone as you write.", websiteUrl: "https://www.grammarly.com", categories: ["content-design"] }),
  app({ slug: "adobe-express", name: "Adobe Express", provider: "Adobe", description: "Make quick graphics, videos, and pages.", websiteUrl: "https://www.adobe.com/express/", categories: ["content-design"] }),
  app({ slug: "zapier", name: "Zapier", provider: "Zapier", description: "Connect apps so a trigger in one starts work in another.", websiteUrl: "https://zapier.com", categories: ["automation"], popular: true }),
  app({ slug: "make", name: "Make", provider: "Make", description: "Build multi-step automations between the tools you use.", websiteUrl: "https://www.make.com", categories: ["automation"] }),
  app({ slug: "n8n", name: "n8n", provider: "n8n", description: "Automate workflows you can host yourself.", websiteUrl: "https://n8n.io", categories: ["automation", "development"] }),
  app({ slug: "slack", name: "Slack", provider: "Salesforce", description: "Team chat organized by channel.", websiteUrl: "https://slack.com", categories: ["productivity", "customer-service"], popular: true }),
  app({ slug: "zoom", name: "Zoom", provider: "Zoom", description: "Video meetings and webinars.", websiteUrl: "https://zoom.us", categories: ["productivity"] }),
  app({ slug: "google-workspace", name: "Google Workspace", provider: "Google", description: "Gmail, Docs, Drive, and Calendar for a team.", websiteUrl: "https://workspace.google.com", categories: ["productivity"] }),
  app({ slug: "microsoft-365", name: "Microsoft 365", provider: "Microsoft", description: "Word, Excel, Outlook, and Teams in one subscription.", websiteUrl: "https://www.microsoft.com/microsoft-365", categories: ["productivity"], popular: true }),
  app({ slug: "asana", name: "Asana", provider: "Asana", description: "Assign tasks and track project progress.", websiteUrl: "https://asana.com", categories: ["productivity"] }),
  app({ slug: "linear", name: "Linear", provider: "Linear", description: "Track issues and product work for a software team.", websiteUrl: "https://linear.app", categories: ["development", "productivity"] }),
  app({ slug: "zendesk", name: "Zendesk", provider: "Zendesk", description: "Receive and reply to customer support tickets.", websiteUrl: "https://www.zendesk.com", categories: ["customer-service"] }),
  app({ slug: "intercom", name: "Intercom", provider: "Intercom", description: "Chat with website visitors and follow up by email.", websiteUrl: "https://www.intercom.com", categories: ["customer-service", "sales"] }),
  app({ slug: "freshdesk", name: "Freshdesk", provider: "Freshworks", description: "A shared inbox for customer support email.", websiteUrl: "https://www.freshworks.com/freshdesk/", categories: ["customer-service"] }),
  app({ slug: "github", name: "GitHub", provider: "GitHub", description: "Host code and review changes with your team.", websiteUrl: "https://github.com", categories: ["development"], popular: true }),
  app({ slug: "vercel", name: "Vercel", provider: "Vercel", description: "Deploy websites and preview each change.", websiteUrl: "https://vercel.com", categories: ["development", "infrastructure"] }),
  app({ slug: "supabase", name: "Supabase", provider: "Supabase", description: "A hosted Postgres database with authentication.", websiteUrl: "https://supabase.com", categories: ["development", "infrastructure"] }),
  app({ slug: "cloudflare", name: "Cloudflare", provider: "Cloudflare", description: "DNS, a firewall, and a content network for a site.", websiteUrl: "https://www.cloudflare.com", categories: ["infrastructure", "security"], popular: true }),
  app({ slug: "1password", name: "1Password", provider: "1Password", description: "Store and share passwords with a team.", websiteUrl: "https://1password.com", categories: ["security"] }),
];

export const HOME_FEATURED_SLUGS = ["chatgpt", "canva", "hubspot", "meta-ads", "google-ai", "notion"] as const;

export function logoUrl(websiteUrl: string): string {
  try {
    const host = new URL(websiteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return "";
  }
}
