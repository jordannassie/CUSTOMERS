// Homepage pictures and the video from the live site. They stay in the live project's public storage, which
// next.config.ts (images) and the security headers (media) already allow, so every deploy shows the same files.
const LIVE = "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images";

export const MR_DIRECT_DESK = `${LIVE}/Mr.Direct/Offic.png`;
export const MR_DIRECT_STOREFRONT = `${LIVE}/Mr.Direct/Smug%20Spokesperson%20Among%20AI%20Icons.png`;
// HEVC (H.265) in a QuickTime file: Safari and Chrome with hardware support play it, Firefox does not.
export const MR_DIRECT_VIDEO = `${LIVE}/Mr.Direct/Customers.mov`;
export const TEAM_PHOTO = `${LIVE}/people/15f9dc67-664b-4bf6-bb85-6d3f09ace1d0.png`;

const banner = (n: string) => `${LIVE}/banners/banner1/ChatGPT%20Image%20Aug%2026,%202026,%2012_26_${n}.png`;

export const BANNERS = [
  { src: banner("18%20PM%20(6)"), industry: "Hair salon", alt: "A hair salon owner gets a new booking that came from an AI answer" },
  { src: banner("17%20PM%20(2)"), industry: "Dental practice", alt: "A dentist gets a new patient request that came from an AI answer" },
  { src: banner("17%20PM%20(1)"), industry: "Fitness studio", alt: "A gym owner gets a new member sign-up that came from an AI answer" },
  { src: banner("18%20PM%20(7)"), industry: "Auto repair", alt: "A mechanic gets a service booking that came from an AI answer" },
] as const;

const step = (n: string) => `${LIVE}/steps/ChatGPT%20Image%20Aug%2026,%202026,%2002_16_${n}.png`;

/** The four step pictures, keyed by the How it works step they illustrate. */
export const STEP_PICTURES = {
  Measure: { src: step("54%20PM%20(2)"), alt: "A website being read and checked" },
  Compare: { src: step("55%20PM%20(3)"), alt: "Your shop as the tallest bar beside other shops" },
  Fix: { src: step("55%20PM%20(4)"), alt: "A Claude prompt turning into a checklist of fixes" },
  Track: { src: step("54%20PM%20(1)"), alt: "Customers.Direct linked to a business website" },
} as const;
