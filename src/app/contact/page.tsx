import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/site/ContactForm";
import { CONTACT_EMAIL } from "@/components/legal/LegalPage";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import { MrDirectAvatar } from "@/components/site/MrDirectAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { pageMetadata } from "@/lib/site-metadata";

const title = "Contact";
const description =
  "Questions about checking your business in ChatGPT, Claude and Perplexity, agency accounts, AI video ads or a demo? Send Mr. Direct and the team a message and we will reply by email.";

// Team photo, from main (kept in the live project's storage like the other public site images).
const TEAM_PHOTO =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/people/66a95df7-6aa3-4550-a5cf-73026946a51f.png";

export const metadata: Metadata = pageMetadata({ title, description, path: "/contact" });

const TOPICS = [
  { title: "Your business in AI answers", body: "What we check, how the score works, and what you can fix." },
  { title: "Agency accounts", body: "Tracking many client businesses, custom credits and reports with your logo." },
  { title: "A demo call", body: "A short walk through a real report for a business like yours." },
] as const;

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <section className="mx-auto max-w-[1120px] px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-22">
          <div className="mb-10 overflow-hidden rounded-md border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- a wide photo from storage, shown once at its own size */}
            <img src={TEAM_PHOTO} alt="The Customers.Direct team" className="max-h-[400px] w-full object-cover object-top" />
          </div>
          <div className="flex max-w-[60ch] flex-col items-start gap-5 sm:flex-row sm:items-center">
            <MrDirectAvatar priority className="size-24 shrink-0 border-4 border-primary sm:size-28" />
            <div className="flex flex-col gap-4">
              <h1 className="text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
                Talk to Mr. Direct
              </h1>
              <p className="text-lg text-muted-foreground text-pretty">
                Ask Mr. Direct and the team anything about how AI assistants recommend local businesses, how we measure
                it, or AI video ads. We reply by email.
              </p>
            </div>
          </div>

          <div className="mt-12 grid items-start gap-10 md:grid-cols-[1fr_320px]">
            {/* ContactForm reads ?interest= with useSearchParams, which needs a Suspense boundary. */}
            <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-md" />}>
              <ContactForm source="contact_page" />
            </Suspense>

            <aside className="flex flex-col gap-6">
              <div>
                <h2 className="text-sm font-semibold">We can help with</h2>
                <ul className="mt-3 flex flex-col divide-y divide-border border-y border-border">
                  {TOPICS.map(({ title, body }) => (
                    <li key={title} className="py-4">
                      <p className="text-[15px] font-medium">{title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Prefer email? Write to{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
              <p className="text-sm text-muted-foreground">
                Looking for prices?{" "}
                <Link href="/pricing" className="text-primary underline-offset-4 hover:underline">
                  See plans and the free trial
                </Link>
                .
              </p>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
