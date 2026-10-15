import { isAllowedReviewUrl } from "@/modules/apps-directory/schema";
import { formatReviewCount, hasVerifiedRating, ratingStars, reviewSourceLabel } from "@/modules/apps-directory/rating";
import type { AppSource, DirectoryApp } from "@/modules/apps-directory/types";
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

export function AppRating({
  app,
  source,
  link = true,
  compact = false,
}: {
  app: DirectoryApp;
  source: AppSource;
  link?: boolean;
  compact?: boolean;
}) {
  const rated = hasVerifiedRating(app);
  const reviews = isAllowedReviewUrl(app.reviewUrl);
  if (!rated && !reviews) return null;
  const scale = app.ratingScale > 0 ? app.ratingScale : 5;
  const count = rated && typeof app.reviewCount === "number" ? formatReviewCount(app.reviewCount) : null;
  const label = rated && app.reviewSource ? reviewSourceLabel(app.reviewSource) : null;

  return (
    <div className={compact ? "mt-1 flex w-full flex-col items-center" : "mt-2"}>
      {rated && app.rating !== null && label ? (
        <p className={`flex flex-wrap items-center gap-1 text-[#777773] ${compact ? "justify-center text-[10px]" : "text-[12px]"}`}>
          <span className="inline-flex items-center gap-0.5" aria-hidden="true">
            {ratingStars(app.rating, scale).map((fill, index) => (
              <StarMark key={index} fill={fill} />
            ))}
          </span>
          <span className="font-semibold text-[#171717]">
            {app.rating.toFixed(1)}/{scale}
          </span>
          {count ? <span>({count})</span> : null}
          <span aria-hidden="true">·</span>
          <span>{label}</span>
        </p>
      ) : null}
      {link && reviews ? (
        <a
          href={`/apps/go/${app.slug}/review/${source}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`relative z-10 inline-flex font-semibold text-[#0866F5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] ${compact ? "mt-1 text-[11px]" : "mt-1 text-[12px]"}`}
        >
          Read Reviews <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
  );
}
