import { PORTFOLIO_VIDEOS } from "@/modules/video-ads/portfolio";
import { PortfolioVideo } from "./PortfolioVideo";

export function AdsPortfolio() {
  return (
    <section id="work" className="scroll-mt-28 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-[32px] font-bold tracking-tight text-[#171717] sm:text-[40px]">
            See What AI Can Create.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#777773]">
            Real examples of AI-powered video creative. Imagine what we could make for your brand.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {PORTFOLIO_VIDEOS.map((video) => (
            <PortfolioVideo key={video.id} src={video.src} title={video.title} note={video.note} compact />
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-xl text-center text-[13px] leading-relaxed text-[#777773]">
          This reel wall plays our production sample. These are not customer ads or testimonials.
        </p>
      </div>
    </section>
  );
}
