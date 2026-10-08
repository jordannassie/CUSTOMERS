export const VIDEO_AD_PACKAGE_IDS = ["starter", "growth", "scale"] as const;

export type VideoAdPackageId = (typeof VIDEO_AD_PACKAGE_IDS)[number];

export type VideoAdPackage = {
  id: VideoAdPackageId;
  name: string;
  priceLabel: string;
  amountCents: number;
  cta: string;
  featured: boolean;
  checkoutName: string;
  features: readonly string[];
};

/** Server catalog. Checkout always prices from this list, never from the browser. */
export const VIDEO_AD_PACKAGES: readonly VideoAdPackage[] = [
  {
    id: "starter",
    name: "Starter",
    priceLabel: "$99",
    amountCents: 9_900,
    cta: "Get 1 Video: $99",
    featured: true,
    checkoutName: "Customers.Direct AI video ad, Starter",
    features: [
      "One 15-second AI video ad",
      "Vertical 9:16 format",
      "Facebook, Instagram & TikTok ready",
      "One revision",
      "Digital MP4 delivery",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    priceLabel: "$297",
    amountCents: 29_700,
    cta: "Get 3 Videos: $297",
    featured: false,
    checkoutName: "Customers.Direct AI video ads, Growth",
    features: [
      "Three 15-second AI video ads",
      "Three creative concepts",
      "Vertical 9:16 format",
      "One revision per video",
      "Digital MP4 delivery",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    priceLabel: "$495",
    amountCents: 49_500,
    cta: "Get 5 Videos: $495",
    featured: false,
    checkoutName: "Customers.Direct AI video ads, Scale",
    features: [
      "Five 15-second AI video ads",
      "Five creative concepts",
      "Vertical 9:16 format",
      "One revision per video",
      "Digital MP4 delivery",
    ],
  },
];

export function getVideoAdPackage(id: string | null | undefined): VideoAdPackage | null {
  if (!id) return null;
  return VIDEO_AD_PACKAGES.find((pack) => pack.id === id) ?? null;
}

export type PaidCheckoutSnapshot = {
  mode: string | null;
  paymentStatus: string | null;
  amountTotal: number | null;
  currency: string | null;
  kind: string | null;
  packageId: string | null;
};

/** A redirect is not proof of payment. The signed Stripe session has to match this catalog. */
export function matchPaidPackage(snapshot: PaidCheckoutSnapshot): VideoAdPackage | null {
  if (snapshot.kind !== "video_ad") return null;
  if (snapshot.mode !== "payment") return null;
  if (snapshot.paymentStatus !== "paid") return null;
  if (snapshot.currency !== "usd") return null;
  const pack = getVideoAdPackage(snapshot.packageId);
  if (!pack || snapshot.amountTotal !== pack.amountCents) return null;
  return pack;
}
