"use client";

import { Download, Plus } from "lucide-react";
import { questionsCsv } from "@/modules/questions/csv";
import { Button } from "@/components/ui/button";
import { useQuestions } from "./QuestionsProvider";

export const NEW_QUESTION_ID = "new-question";

/** Export CSV writes the rows the list shows now; Add question goes to the form under the list. */
export function HeaderActions() {
  const { view, shown } = useQuestions();
  const rows = [...shown.active, ...shown.paused];

  function exportCsv() {
    // A byte order mark, so spreadsheet apps read names with accents correctly.
    const blob = new Blob(["﻿", questionsCsv(rows, view.models)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    // In the page while clicked, and the address kept a while: some browsers ignore a detached link, or start the
    // download only after the click returns.
    const link = Object.assign(document.createElement("a"), { href: url, download: "questions.csv" });
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  function goToForm() {
    const input = document.getElementById(NEW_QUESTION_ID);
    input?.closest("form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (input instanceof HTMLInputElement && !input.disabled) input.focus({ preventScroll: true });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={exportCsv} disabled={rows.length === 0} data-testid="export-csv">
        <Download aria-hidden="true" />
        Export CSV
      </Button>
      <Button type="button" onClick={goToForm} data-testid="go-add-question">
        <Plus aria-hidden="true" />
        Add question
      </Button>
    </div>
  );
}
