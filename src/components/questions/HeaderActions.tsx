"use client";

import { Download, Plus } from "lucide-react";
import { questionsCsv } from "@/modules/questions/csv";
import { Button } from "@/components/ui/button";
import { useQuestions } from "./QuestionsProvider";

export const NEW_QUESTION_ID = "new-question";

/** Export CSV writes the rows the list shows now; Add question goes to the form under the numbers. */
export function HeaderActions() {
  const { view, shown } = useQuestions();
  const rows = [...shown.active, ...shown.paused];

  function exportCsv() {
    // A byte order mark, so spreadsheet apps read names with accents correctly.
    const blob = new Blob(["﻿", questionsCsv(rows, view.models)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "questions.csv";
    link.click();
    URL.revokeObjectURL(url);
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
