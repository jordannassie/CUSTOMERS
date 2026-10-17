import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { ReviewForm } from "@/components/site/apps/ReviewForm";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides } from "@/modules/apps-directory/dal";
import { mergeCatalog } from "@/modules/apps-directory/service";
import { currentReviewer, findOwnReview } from "@/modules/apps-directory/review-dal";
import { canSubmitReview } from "@/modules/apps-directory/review-service";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const app = DIRECTORY_CATALOG.find((item) => item.slug === slug);
  return {
    title: app ? `Write a review of ${app.name}` : "Write a review",
    robots: { index: false, follow: false },
    alternates: { canonical: `https://customers.direct/apps/${slug}` },
  };
}

export default async function WriteReviewPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug } = await params;
  const raw = await searchParams;
  const overrides = await listDirectoryOverrides();
  const app = mergeCatalog(DIRECTORY_CATALOG, overrides.apps).find((item) => item.active && item.slug === slug);
  if (!app) notFound();
  const reviewer = await currentReviewer();
  const gate = canSubmitReview({ signedIn: Boolean(reviewer), emailConfirmed: Boolean(reviewer?.emailConfirmed) });
  const existing = reviewer ? await findOwnReview(reviewer.userId, app.slug) : null;
  const saved = raw.saved === "pending";
  const error = typeof raw.error === "string" ? raw.error : undefined;

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#FAFAF8]">
        <article className="mx-auto max-w-[720px] px-4 pb-16 pt-28 sm:pt-32">
          <Link href={`/apps/${app.slug}`} className="text-[13px] font-semibold text-[#0866F5]">Back to {app.name}</Link>
          <h1 className="mt-3 text-[28px] font-bold tracking-tight text-[#171717]">Write a Review</h1>
          <p className="mt-2 text-[14px] text-[#777773]">Reviews stay private until a moderator publishes them. A high rating is not published automatically.</p>
          {saved ? <p className="mt-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-[14px] text-[#166534]">Your review is pending. It will appear after moderation.</p> : null}
          {!gate.ok && gate.code === "sign-in" ? (
            <a href={`/login?next=/apps/${app.slug}/review`} className="mt-6 inline-flex h-10 items-center rounded-xl bg-[#0866F5] px-4 text-[14px] font-semibold text-white">Sign in to write a review</a>
          ) : null}
          {!gate.ok && gate.code === "confirm-email" ? (
            <p className="mt-6 text-[14px] text-[#171717]">Confirm your email before writing a review. Open the link in your confirmation message, then come back.</p>
          ) : null}
          {gate.ok ? <ReviewForm slug={app.slug} existing={existing} error={error} /> : null}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
