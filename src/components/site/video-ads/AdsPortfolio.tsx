import { PORTFOLIO_VIDEOS } from "@/modules/video-ads/portfolio";
import { PortfolioVideo } from "./PortfolioVideo";

export function AdsPortfolio() {
  return (
    <section id="work" className="scroll-mt-28 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-[calc(1200px*var(--px,1))] px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-[length:calc(32px*var(--px,1))] font-bold tracking-tight text-[#171717] sm:text-[length:calc(40px*var(--px,1))]">
            See What AI Can Create.
          </h2>
          <p className="mt-4 text-[length:calc(16px*var(--px,1))] leading-relaxed text-[#777773]">
            Real examples of AI-powered video creative. Imagine what we could make for your brand.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {PORTFOLIO_VIDEOS.map((video) => (
            <PortfolioVideo key={video.id} src={video.src} title={video.title} note={video.note} compact />
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-xl text-center text-[length:calc(13px*var(--px,1))] leading-relaxed text-[#777773]">
          This reel wall plays our production sample. These are not customer ads or testimonials.
        </p>
      </div>
    </section>
  );
}
