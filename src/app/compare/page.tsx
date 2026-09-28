import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import { Lead } from "@/components/marketing/section";
import { ReadinessCheck } from "./ReadinessCheck";
import { CheckForm } from "./CheckForm";
import { pageMetadata } from "@/lib/site-metadata";

const description =
  "Free check: see how easy your website is for AI tools to understand, next to a competitor's. Reads both home pages; no account needed.";

export const metadata: Metadata = pageMetadata({ title: "AI readiness check", description, path: "/compare" });

export default function ComparePage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-22">
          <div className="flex max-w-[720px] flex-col gap-4">
            <h1 className="text-[40px] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
              AI readiness check
            </h1>
            <Lead>
              See how easy your website is for AI to understand, next to a competitor&apos;s. We read both home
              pages and check the basics AI tools rely on: business details, contact info, content and reviews.
            </Lead>
            <p className="max-w-[60ch] text-[14px] text-muted-foreground">
              This free check reads websites only. It does not ask ChatGPT, Claude or Perplexity anything; the
              7-day trial does that.
            </p>
          </div>
          <Suspense fallback={<CheckForm initialMine="" initialTheirs="" loading={false} onSubmit={null} />}>
            <ReadinessCheck />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
