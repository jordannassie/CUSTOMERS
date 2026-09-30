import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const optional = z.string().min(1).optional();
const flag = z.enum(["true", "false"]).optional();

// The only file that reads process.env (MVP_SPEC 18.1). Required values fail the build when missing.
export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    OPENAI_API_KEY: optional,
    OPENAI_NEWS_MODEL: z.string().min(1).default("gpt-4o"),
    ANTHROPIC_API_KEY: optional,
    PERPLEXITY_API_KEY: optional,
    GOOGLE_PLACES_API_KEY: optional,
    FIRECRAWL_API_KEY: optional,
    BROWSERLESS_API_KEY: optional,
    // Search Intelligence stays on hold until D-06 is decided.
    DATAFORSEO_USERNAME: optional,
    DATAFORSEO_PASSWORD: optional,

    STRIPE_SECRET_KEY: optional,
    STRIPE_WEBHOOK_SECRET: optional,
    STRIPE_PRICE_STARTER_MONTHLY: optional,
    STRIPE_PRICE_GROWTH_MONTHLY: optional,
    STRIPE_PRICE_PRO_MONTHLY: optional,

    RESEND_API_KEY: optional,
    EMAIL_FROM: optional,

    GEO_CRON_SECRET: optional,
    WORKER_SECRET: optional,

    ADMIN_EMAILS: optional,
    ADMIN_USER_IDS: optional,

    BILLING_ENABLED: flag,
    BETA_FREE_ACCESS: flag,
    TRIAL_ENABLED: flag,
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SITE_URL: z.url().optional(),
    NEXT_PUBLIC_APP_URL: z.url().optional(),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_NEWS_MODEL: process.env.OPENAI_NEWS_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    BROWSERLESS_API_KEY: process.env.BROWSERLESS_API_KEY,
    DATAFORSEO_USERNAME: process.env.DATAFORSEO_USERNAME,
    DATAFORSEO_PASSWORD: process.env.DATAFORSEO_PASSWORD,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_STARTER_MONTHLY: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    STRIPE_PRICE_GROWTH_MONTHLY: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
    STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    GEO_CRON_SECRET: process.env.GEO_CRON_SECRET,
    WORKER_SECRET: process.env.WORKER_SECRET,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
    BILLING_ENABLED: process.env.BILLING_ENABLED,
    BETA_FREE_ACCESS: process.env.BETA_FREE_ACCESS,
    TRIAL_ENABLED: process.env.TRIAL_ENABLED,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
});
