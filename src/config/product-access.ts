/**
 * Centralized product access configuration for Customers.Direct.
 *
 * ─── CURRENT STATE: Free Beta ────────────────────────────────────────────────
 *
 *   betaFreeAccess = true   → all authenticated users have complete MVP access
 *   billingEnabled = false  → Stripe checkout / enforcement disabled
 *   trialEnabled   = false  → trial countdown UI and expiration gating disabled
 *
 * ─── TO ENABLE PAID BILLING LATER ────────────────────────────────────────────
 *
 *   1. Set env vars:  BETA_FREE_ACCESS=false  BILLING_ENABLED=true
 *   2. Re-enable Stripe checkout routes.
 *   3. Add plan enforcement to mutation API routes using getTrialStatus().
 *   4. Update TrialBanner and settings page copy.
 *
 *   All access decisions in the codebase derive from this single config object,
 *   so re-enabling billing requires changing these env vars and the Stripe
 *   integration only — not rewriting every route.
 */

export const PRODUCT_ACCESS = {
  /**
   * Beta free access flag.
   *
   * When TRUE (default): every authenticated user has full product access.
   * Trial dates, subscription records, and plan limits have NO impact on what
   * a user can do. The product is free during this phase.
   *
   * When FALSE: access is gated by trial expiry / active subscription as
   * determined by getTrialStatus() — activate after beta ends.
   *
   * Override: set environment variable BETA_FREE_ACCESS=false to disable.
   */
  betaFreeAccess: process.env.BETA_FREE_ACCESS !== "false",

  /**
   * Stripe/billing flag.
   *
   * When FALSE (default): no Stripe checkout buttons or portal links are shown.
   * Existing Stripe code and routes are preserved for future activation.
   *
   * When TRUE: Stripe checkout and portal become active for paying users.
   *
   * Override: set environment variable BILLING_ENABLED=true to activate.
   */
  billingEnabled: process.env.BILLING_ENABLED === "true",

  /**
   * Trial expiration flag.
   *
   * When FALSE (default): trial countdown UI is hidden; trial_ends_at in the
   * database has no effect on product access or UI messaging.
   * Database fields (trial_starts_at, trial_ends_at) are preserved for when
   * billing is activated.
   *
   * When TRUE: trial countdown banners, expiration gating, and upgrade prompts
   * are re-enabled.
   *
   * Override: set environment variable TRIAL_ENABLED=true to activate.
   */
  trialEnabled: process.env.TRIAL_ENABLED === "true",

  /**
   * Beta usage safeguards — internal cost-protection limits.
   *
   * These are NOT exposed to users as "plan limits." They exist solely to
   * prevent runaway API costs during beta. Limits should be generous enough
   * to allow complete product exploration.
   *
   * Once billing is enabled, replace these with per-plan limits from the
   * pricing configuration.
   */
  betaLimits: {
    maxBusinessesPerAccount: 3,
    maxCompetitorsPerBusiness: 10,
    maxPromptsPerBusiness: 30,
    maxManualScansPerDay: 5,
    seoRefreshCooldownHours: 24,
    googlePlacesRequestsPerHour: 60,
  },
} as const;

/** True if Stripe billing is currently active and users may be charged. */
export const billingEnabled = PRODUCT_ACCESS.billingEnabled;

/** True if the product is in free-beta mode (all users get full access). */
export const betaFreeAccess = PRODUCT_ACCESS.betaFreeAccess;
