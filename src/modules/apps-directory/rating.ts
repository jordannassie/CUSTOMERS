import type { ReviewSource } from "./types";

export function ratingStars(rating: number, scale = 5): number[] {
  const safeScale = Number.isFinite(scale) && scale > 0 ? Math.round(scale) : 5;
  const safeRating = Math.min(safeScale, Math.max(0, rating));
  return Array.from({ length: safeScale }, (_, index) => {
    const portion = safeRating - index;
    if (portion >= 1) return 1;
    if (portion <= 0) return 0;
    return Math.round(portion * 100) / 100;
  });
}

export function hasVerifiedRating(app: {
  rating: number | null;
  ratingScale: number;
  reviewSource: ReviewSource | null;
}): boolean {
  return app.reviewSource !== null && typeof app.rating === "number" && app.rating >= 0 && app.rating <= app.ratingScale;
}

export function reviewSourceLabel(source: ReviewSource): string {
  return source === "g2" ? "G2" : "Capterra";
}

export function formatReviewCount(count: number): string {
  return Math.trunc(count).toLocaleString("en-US");
}
