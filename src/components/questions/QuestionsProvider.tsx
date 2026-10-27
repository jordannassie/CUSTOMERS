"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { visibleRows, type ListFilter } from "@/modules/questions/list";
import type { QuestionRow, QuestionsView } from "@/modules/questions/service";

/** From the page's link (questionsHref): the question to open, and the site or business the list is narrowed to. */
export type ListFocus = { q: string | null; site: string | null; named: string | null };

type State = {
  view: QuestionsView;
  focus: ListFocus;
  filter: ListFilter;
  setFilter: (f: ListFilter) => void;
  topic: string | null;
  setTopic: (t: string | null) => void;
  showPaused: boolean;
  setShowPaused: (v: boolean) => void;
  openId: string | null;
  toggle: (id: string) => void;
  /** The rows the list shows now, the ones Export CSV writes. */
  shown: { active: QuestionRow[]; paused: QuestionRow[] };
  /** How many rows the filters chose from. */
  total: number;
};

const Ctx = createContext<State | null>(null);

export function useQuestions(): State {
  const state = useContext(Ctx);
  if (!state) throw new Error("useQuestions needs a QuestionsProvider");
  return state;
}

// The Questions page's list state, shared by the header (Export CSV), the filters, the list and its footer.
export function QuestionsProvider({ view, focus, children }: { view: QuestionsView; focus: ListFocus; children: React.ReactNode }) {
  const linkedPaused = !!focus.q && view.paused.some((r) => r.id === focus.q);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [topic, setTopic] = useState<string | null>(null);
  const [showPaused, setShowPaused] = useState(linkedPaused);
  const [openId, setOpenId] = useState<string | null>(focus.q);

  const state = useMemo<State>(() => {
    const opts = { filter, topic, keepId: focus.q };
    const active = visibleRows(view.active, opts);
    const paused = showPaused ? visibleRows(view.paused, opts) : [];
    const total = view.active.filter((r) => r.matches).length + (showPaused ? view.paused.filter((r) => r.matches).length : 0);
    return {
      view,
      focus,
      filter,
      setFilter,
      topic,
      setTopic,
      showPaused,
      setShowPaused,
      openId,
      toggle: (id) => setOpenId((now) => (now === id ? null : id)),
      shown: { active, paused },
      total,
    };
  }, [view, focus, filter, topic, showPaused, openId]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
