import { env } from "@/lib/env";

export {
  AGENCY_ACTIVE_STATUSES,
  AGENCY_PROGRAM_PRICE_CENTS,
  AGENCY_PROGRAM_PRICE_LABEL,
  AGENCY_PROGRAM_PRODUCT,
  LAUNCH_KIT_PRICE_CENTS,
  LAUNCH_KIT_PRICE_LABEL,
  LAUNCH_KIT_PRODUCT,
} from "./constants";

export function launchKitPriceId(): string | null {
  return env.STRIPE_PRICE_LAUNCH_KIT ?? null;
}

export function agencyProgramPriceId(): string | null {
  return env.STRIPE_PRICE_AGENCY_MONTHLY ?? null;
}

export function isLaunchKitPrice(priceId: string | null | undefined): boolean {
  const configured = launchKitPriceId();
  return !!priceId && !!configured && priceId === configured;
}

export function isAgencyProgramPrice(priceId: string | null | undefined): boolean {
  const configured = agencyProgramPriceId();
  return !!priceId && !!configured && priceId === configured;
}
