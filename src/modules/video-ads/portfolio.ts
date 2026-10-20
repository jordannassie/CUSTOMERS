export type PortfolioExample = {
  id: string;
  src: string;
  title: string;
  note: string;
};

const SAMPLE_SRC =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/UGC%20videos/hf_20260504_161728_1fe36f3f-a863-4d66-907b-b38d04c80ee8.mp4";

/** Four rows of four. One real sample fills the wall until more MP4s are added. */
export const PORTFOLIO_VIDEOS: readonly PortfolioExample[] = Array.from({ length: 16 }, (_, index) => ({
  id: `ugc-sample-${index + 1}`,
  src: SAMPLE_SRC,
  title: `Production sample ${index + 1}`,
  note: "Production sample of AI-powered video creative. Not a customer ad or a testimonial.",
}));
