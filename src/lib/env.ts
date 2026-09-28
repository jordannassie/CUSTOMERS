import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const optional = z.string().min(1).optional();
const flag = z.enum(["true", "false"]).optional();

// The only file that reads process.env (MVP_SPEC 18.1). Required values fail the build when missing.
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    OPENAI_API_KEY: optional,
    OPENAI_NEWS_MODEL: z.string().min(1).default("gpt-4o"),
    ANTHROPIC_API_KEY: optional,
    PERPLEXITY_API_KEY: optional,
    GOOGLE_PLACES_API_KEY: optional,
    // Dev and Playwright only: the competitor step answers from hand-built fixtures, never Google.
    PLACES_FIXTURES: flag,
    // Dev and Playwright only: auto-fill and question picking answer from fixtures, never Firecrawl, Google or Claude.
    ONBOARDING_FIXTURES: flag,
    FIRECRAWL_API_KEY: optional,
    BROWSERLESS_API_KEY: optional,
    // PDF export (B-60, D-71): hosted Chrome, or our own Chromium when Browserless is down or for local checks.
    PDF_RENDERER: z.enum(["browserless", "chromium"]).default("browserless"),
    BROWSERLESS_URL: z.url().default("https://production-sfo.browserless.io"),
    // Local Chrome for the chromium renderer on a laptop; unset uses the @sparticuz/chromium build (Linux only).
    CHROMIUM_PATH: optional,
    // Search Intelligence stays on hold until D-06 is decided.
    DATAFORSEO_USERNAME: optional,
    DATAFORSEO_PASSWORD: optional,

    STRIPE_SECRET_KEY: optional,
    STRIPE_WEBHOOK_SECRET: optional,
    // Dev and Playwright only: the card step and top-ups make a fake Checkout Session and card form, never Stripe.
    STRIPE_CHECKOUT_FIXTURES: flag,
    STRIPE_PRICE_STARTER_MONTHLY: optional,
    STRIPE_PRICE_GROWTH_MONTHLY: optional,
    STRIPE_PRICE_PRO_MONTHLY: optional,

    RESEND_API_KEY: optional,
    EMAIL_FROM: optional,
    // Signs unsubscribe links (B-61). Changing it breaks the links in emails already sent.
    EMAIL_UNSUBSCRIBE_SECRET: z.string().min(32).optional(),

    WORKER_SECRET: optional,
    // 600 on a Netlify background function (15-minute limit), 240 on Vercel (D-41, MVP_SPEC 6.3).
    WORKER_TIME_BUDGET_SECONDS: z.coerce.number().int().positive().default(600),
    // Run scan (B-29) posts here to start the worker at once; unset leaves the job to the every-minute schedule.
    WORKER_URL: z.url().optional(),
    // Local dev only: with no WORKER_URL, run the worker inside the dev server after Run scan.
    WORKER_IN_PROCESS: flag,

    ADMIN_EMAILS: optional,

    BILLING_ENABLED: flag,
    BETA_FREE_ACCESS: flag,
    TRIAL_ENABLED: flag,
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SITE_URL: z.url().optional(),
    NEXT_PUBLIC_APP_URL: z.url().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_NEWS_MODEL: process.env.OPENAI_NEWS_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    PLACES_FIXTURES: process.env.PLACES_FIXTURES,
    ONBOARDING_FIXTURES: process.env.ONBOARDING_FIXTURES,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    BROWSERLESS_API_KEY: process.env.BROWSERLESS_API_KEY,
    PDF_RENDERER: process.env.PDF_RENDERER,
    BROWSERLESS_URL: process.env.BROWSERLESS_URL,
    CHROMIUM_PATH: process.env.CHROMIUM_PATH,
    DATAFORSEO_USERNAME: process.env.DATAFORSEO_USERNAME,
    DATAFORSEO_PASSWORD: process.env.DATAFORSEO_PASSWORD,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_CHECKOUT_FIXTURES: process.env.STRIPE_CHECKOUT_FIXTURES,
    STRIPE_PRICE_STARTER_MONTHLY: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    STRIPE_PRICE_GROWTH_MONTHLY: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
    STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_UNSUBSCRIBE_SECRET: process.env.EMAIL_UNSUBSCRIBE_SECRET,
    WORKER_SECRET: process.env.WORKER_SECRET,
    WORKER_TIME_BUDGET_SECONDS: process.env.WORKER_TIME_BUDGET_SECONDS,
    WORKER_URL: process.env.WORKER_URL,
    WORKER_IN_PROCESS: process.env.WORKER_IN_PROCESS,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    BILLING_ENABLED: process.env.BILLING_ENABLED,
    BETA_FREE_ACCESS: process.env.BETA_FREE_ACCESS,
    TRIAL_ENABLED: process.env.TRIAL_ENABLED,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  emptyStringAsUndefined: true,
});
