// What we know about the business's own website from setup (business_site_facts). Pure. A site that blocked our
// reader is not the same as no website, and must never get "build a website" advice (BUG-087).
import { z } from "zod";

export type YourWebsite = {
  /** read: we read at least one page. blocked: it refused automated readers. unreachable: it did not load. */
  readStatus: "read" | "blocked" | "unreachable";
  pagesRead: string[];
  pagesNotFound: string[];
  /** Null when no page was read, so we cannot say. */
  hasPhone: boolean | null;
  hasAddress: boolean | null;
  servicesListed: string[];
};

const pages = z.object({ pages: z.array(z.object({ path: z.string(), status: z.string() })) });
const facts = z.object({ phone: z.string(), address: z.string(), services: z.array(z.string()) });

/** Null when setup saved nothing about the site. */
export function yourWebsite(saved: unknown): YourWebsite | null {
  const site = pages.safeParse(saved);
  if (!site.success || site.data.pages.length === 0) return null;
  const read = facts.safeParse((saved as { facts?: unknown }).facts);
  const list = site.data.pages;
  if (read.success) {
    return {
      readStatus: "read",
      pagesRead: list.filter((p) => p.status === "ok").map((p) => p.path),
      pagesNotFound: list.filter((p) => p.status === "missing").map((p) => p.path),
      hasPhone: read.data.phone.trim() !== "",
      hasAddress: read.data.address.trim() !== "",
      servicesListed: read.data.services,
    };
  }
  return {
    readStatus: list.some((p) => p.status === "blocked") ? "blocked" : "unreachable",
    pagesRead: [],
    pagesNotFound: [],
    hasPhone: null,
    hasAddress: null,
    servicesListed: [],
  };
}
