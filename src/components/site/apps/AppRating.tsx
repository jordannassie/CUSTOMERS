import { isAllowedReviewUrl } from "@/modules/apps-directory/schema";
import { formatReviewCount, hasVerifiedRating, ratingStars, reviewSourceLabel } from "@/modules/apps-directory/rating";
import type { AppSource, DirectoryApp } from "@/modules/apps-directory/types";
import type { NativeSummary } from "@/modules/apps-directory/review-types";
import { Star } from "lucide-react";

function StarMark({ fill }: { fill: number }) {
  return (
    <span className="relative inline-flex h-3 w-3 shrink-0" aria-hidden="true">
      <Star size={12} className="text-[#E5E5E1]" fill="currentColor" strokeWidth={0} />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.round(fill * 100)}%` }}>
        <Star size={12} className="text-[#E8B006]" fill="currentColor" strokeWidth={0} />
      </span>
    </span>
  );
}

function ScoreLine({ rating, count, label, compact }: { rating: number; count: number | null; label: string; compact: boolean }) {
  return (
    <p className={`flex flex-wrap items-center gap-1 text-[#777773] ${compact ? "justify-center text-[10px]" : "text-[12px]"}`}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {ratingStars(rating, 5).map((fill, index) => (
          <StarMark key={index} fill={fill} />
        ))}
      </span>
      <span className="font-semibold text-[#171717]">{rating.toFixed(1)}/5</span>
      {count !== null ? <span>({formatReviewCount(count)})</span> : null}
      <span aria-hidden="true">·</span>
      <span>{label}</span>
    </p>
  );
}

export function AppRating({
  app,
  source,
  link = true,
  compact = false,
  native,
  showEmpty = false,
}: {
  app: DirectoryApp;
  source: AppSource;
  link?: boolean;
  compact?: boolean;
  native?: NativeSummary;
  showEmpty?: boolean;
}) {
  const nativeCount = native?.count ?? 0;
  const nativeRated = nativeCount > 0 && typeof native?.average === "number";
  const licensed = hasVerifiedRating(app);
  const reviews = isAllowedReviewUrl(app.reviewUrl);
  const sourceLabel = app.reviewSource ? reviewSourceLabel(app.reviewSource) : "External";
  if (!nativeRated && !licensed && !reviews && !showEmpty) return null;

  return (
    <div className={compact ? "mt-1 flex w-full flex-col items-center" : "mt-2"}>
      {nativeRated && native?.average !== null && native?.average !== undefined ? (
        <ScoreLine rating={native.average} count={nativeCount} label="Customers.Direct" compact={compact} />
      ) : null}
      {showEmpty && !nativeRated ? <p className="text-[14px] text-[#777773]">Not yet rated.</p> : null}
      {licensed && app.rating !== null && app.reviewSource ? (
        <ScoreLine rating={app.rating} count={app.reviewCount} label={reviewSourceLabel(app.reviewSource)} compact={compact} />
      ) : null}
      {link && reviews ? (
        <a
          href={`/apps/go/${app.slug}/review/${source}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`relative z-10 inline-flex font-semibold text-[#0866F5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] ${compact ? "mt-1 text-[11px]" : "mt-1 text-[12px]"}`}
        >
          {sourceLabel} reviews <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
  );
}
