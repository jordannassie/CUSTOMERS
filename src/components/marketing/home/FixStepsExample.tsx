"use client";

import { useState } from "react";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import type { OpportunityItem, Status } from "@/modules/opportunities";
import { ProductFrame } from "./ProductFrame";

const FIXES: OpportunityItem[] = [
  {
    id: "reviews",
    title: "Get more Google reviews",
    impact: "high",
    status: "open",
    evidence: "Daily Grind has 320 Google reviews at 4.7. You have 12 at 4.2.",
    whyItMatters: "In this scan, the coffee shops with more reviews were named more often.",
    steps: ["Ask your regulars for a review this month.", "Reply to every new review within a week."],
    claudePrompt:
      "Write a short, friendly message Bean House, a coffee shop in Orange, CA, can send to regulars asking for a Google review. Keep it under 60 words.",
    usesGoogle: false,
  },
  {
    id: "oat-milk",
    title: "Add a page about your oat milk drinks",
    impact: "medium",
    status: "open",
    evidence: "AI named Brew Lab for oat milk questions and cited its menu page. Your site has no drinks menu.",
    whyItMatters: "AI can only name you for a drink if it finds a page that says you sell it.",
    steps: ["Add a menu page that lists your oat milk and other plant milk drinks.", "Link to it from your homepage."],
    claudePrompt:
      "Write a short, friendly menu page for Bean House, a coffee shop in Orange, CA. List our oat milk and other plant milk drinks with one line each, and add opening hours and address at the end.",
    usesGoogle: false,
  },
];

/** The Opportunities screen (B-51) with the real fix cards; status changes stay in the browser. */
export function FixStepsExample() {
  const [items, setItems] = useState(FIXES);
  const setStatus = (id: string, status: Status) =>
    setItems((all) => all.map((o) => (o.id === id ? { ...o, status } : o)));

  return (
    <ProductFrame page="Opportunities">
      <div className="grid items-start gap-3 sm:gap-6 lg:grid-cols-2">
        {items.map((item) => (
          <OpportunityCard key={item.id} item={item} busy={false} onStatus={(s) => setStatus(item.id, s)} />
        ))}
      </div>
    </ProductFrame>
  );
}
