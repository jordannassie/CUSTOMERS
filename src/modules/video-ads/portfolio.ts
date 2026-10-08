export type PortfolioExample = {
  id: string;
  src: string;
  title: string;
  note: string;
};

/**
 * Add another MP4 by appending an object. The portfolio grid expands on its own.
 * These are production samples, not customer ads.
 */
export const PORTFOLIO_VIDEOS: readonly PortfolioExample[] = [
  {
    id: "ugc-sample-20260504",
    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/UGC%20videos/hf_20260504_161728_1fe36f3f-a863-4d66-907b-b38d04c80ee8.mp4",
    title: "AI video sample",
    note: "Production sample of AI-powered video creative. Not a customer ad or a testimonial.",
  },
];
