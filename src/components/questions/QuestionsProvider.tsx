"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { AddToActionsAction } from "@/components/actions/AddToActionsButton";
import { visibleRows, type ListFilter } from "@/modules/questions/list";
import type { QuestionRow, QuestionsView } from "@/modules/questions/service";

/** From the page's link (questionsHref): the question to open, and the site or business the list is narrowed to. */
export type ListFocus = { q: string | null; site: string | null; named: string | null; ai?: string | null };

type State = {
  view: QuestionsView;
  focus: ListFocus;
  filter: ListFilter;
  setFilter: (f: ListFilter) => void;
  topic: string | null;
  setTopic: (t: string | null) => void;
  /** Words typed in the list's filter box; rows whose question contains them show. */
  query: string;
  setQuery: (q: string) => void;
  showPaused: boolean;
  setShowPaused: (v: boolean) => void;
  openId: string | null;
  toggle: (id: string) => void;
  /** The rows the list shows now, the ones Export CSV writes. */
  shown: { active: QuestionRow[]; paused: QuestionRow[] };
  /** How many rows the filters chose from. */
  total: number;
  /** addToActions, for "Why you were skipped" (passed in by the page). */
  addAction: AddToActionsAction | null;
};

const Ctx = createContext<State | null>(null);

export function useQuestions(): State {
  const state = useContext(Ctx);
  if (!state) throw new Error("useQuestions needs a QuestionsProvider");
  return state;
}

// The Questions page's list state, shared by the header (Export CSV), the filters, the list and its footer.
export function QuestionsProvider({
  view,
  focus,
  addAction = null,
  children,
}: {
  view: QuestionsView;
  focus: ListFocus;
  addAction?: AddToActionsAction | null;
  children: React.ReactNode;
}) {
  const linkedPaused = !!focus.q && view.paused.some((r) => r.id === focus.q);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [topic, setTopic] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showPaused, setShowPaused] = useState(linkedPaused);
  const [openId, setOpenId] = useState<string | null>(focus.q);

  const state = useMemo<State>(() => {
    const opts = { filter, topic, keepId: focus.q };
    const words = query.trim().toLowerCase();
    const typed = (rows: QuestionRow[]) => (words ? rows.filter((r) => r.text.toLowerCase().includes(words)) : rows);
    const active = typed(visibleRows(view.active, opts));
    const paused = showPaused ? typed(visibleRows(view.paused, opts)) : [];
    const total = view.active.filter((r) => r.matches).length + (showPaused ? view.paused.filter((r) => r.matches).length : 0);
    return {
      view,
      focus,
      filter,
      setFilter,
      topic,
      setTopic,
      query,
      setQuery,
      showPaused,
      setShowPaused,
      openId,
      toggle: (id) => setOpenId((now) => (now === id ? null : id)),
      shown: { active, paused },
      total,
      addAction,
    };
  }, [view, focus, filter, topic, query, showPaused, openId, addAction]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
