import type { ReactNode } from "react";
import { FileWarning } from "lucide-react";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";

export const CONTACT_EMAIL = "jordannassie@gmail.com";

// D-78: both pages stay marked as drafts until a lawyer signs off and an effective date is set.
export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="bg-background px-4 py-12 sm:py-16">
        <article className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-[32px] font-semibold tracking-[-0.02em] sm:text-5xl sm:tracking-[-0.035em]">{title}</h1>
          <p className="mb-6 text-sm text-text-hint">Effective date: to be set after legal review</p>
          <div role="note" className="mb-10 flex gap-3 rounded-md border border-mid/40 bg-mid-bg p-4 text-sm text-mid-text">
            <FileWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong className="font-semibold">Draft, pending legal review.</strong> This page describes how the product
              works today, but a lawyer has not checked it yet. It may change before it takes effect.
            </p>
          </div>
          <div className="flex flex-col gap-8 text-sm leading-relaxed text-foreground">
            {intro}
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>;
}

export function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary">
      {CONTACT_EMAIL}
    </a>
  );
}
