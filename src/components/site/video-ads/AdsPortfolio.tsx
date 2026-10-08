import { PORTFOLIO_VIDEOS } from "@/modules/video-ads/portfolio";
import { PortfolioVideo } from "./PortfolioVideo";

function gridClass(count: number) {
  if (count >= 3) return "grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3";
  if (count === 2) return "mx-auto grid max-w-[760px] grid-cols-1 gap-10 sm:grid-cols-2";
  return "mx-auto max-w-[340px]";
}

export function AdsPortfolio() {
  const videos = PORTFOLIO_VIDEOS;
  return (
    <section id="work" className="scroll-mt-28 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-[32px] font-bold tracking-tight text-[#171717] sm:text-[40px]">
            See What AI Can Create.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#777773]">
            Real examples of AI-powered video creative. Imagine what we could make for your brand.
          </p>
        </div>
        <div className={gridClass(videos.length)}>
          {videos.map((video) => (
            <PortfolioVideo key={video.id} src={video.src} title={video.title} note={video.note} />
          ))}
        </div>
      </div>
    </section>
  );
}
