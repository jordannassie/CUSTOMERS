import { env } from "@/lib/env";

type DevFlag = "PLACES_FIXTURES" | "ONBOARDING_FIXTURES" | "STRIPE_CHECKOUT_FIXTURES" | "WORKER_IN_PROCESS";

/**
 * A development and test switch: on only when set to "true" and never in production, so a stray value in the live
 * environment can't turn on fixtures or the in-process worker. Kept out of env.ts so tests that mock env keep it.
 */
export const devFlag = (name: DevFlag): boolean => env[name] === "true" && env.NODE_ENV !== "production";
