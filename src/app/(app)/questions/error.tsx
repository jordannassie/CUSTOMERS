"use client";

import { PageError } from "@/components/app/PageError";

export default function QuestionsError({ retry }: { error: Error; retry: () => void }) {
  return <PageError safe="Your questions and credits are safe." retry={retry} />;
}
