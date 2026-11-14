"use client";

import { useEffect, useRef, useState } from "react";
import { appFetch } from "@/lib/session-expired";
import { LEADS_CHANGED } from "../../_components/admin-nav";
import { viewKey, viewQuery, type LeadsView } from "./lead-query";
import type { Lead, LeadsResponse } from "./lead-types";

const NETWORK = "Check your internet connection and try again.";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await appFetch(url);
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? "Your admin session has ended. Log in again to see the leads."
        : "Something went wrong on our side. Try again in a moment.",
    );
  }
  return res.json();
}

const message = (err: unknown) => (err instanceof Error && !/fetch|network/i.test(err.message) ? err.message : NETWORK);

type ListState = { key: string; nonce: number; data: LeadsResponse | null; error: string | null };

/**
 * The list for the view in the address bar. The server sends the first one; a new filter or page fetches again, and
 * only the newest answer is shown. A page past the end comes back as the last page, and the address follows it.
 */
export function useLeadsList(view: LeadsView, leadId: string | null, initial: LeadsResponse | null, initialView: LeadsView) {
  const key = viewKey(view);
  const [nonce, setNonce] = useState(0);
  const [list, setList] = useState<ListState>(() => ({
    key: viewKey(initial ? { ...initialView, page: initial.page } : initialView),
    nonce: 0,
    data: initial,
    error: initial ? null : "Something went wrong on our side. Try again in a moment.",
  }));
  const loading = list.key !== key || list.nonce !== nonce;

  // The server answered for another page (past the end): the address shows the page on screen.
  useEffect(() => {
    if (initial && initial.page !== initialView.page) {
      window.history.replaceState(null, "", viewQuery({ ...initialView, page: initial.page }, leadId) || window.location.pathname);
    }
    // Once, for the page the server sent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) return;
    let stale = false;
    fetchJson<LeadsResponse>(`/api/internal/admin/leads?${key}`).then(
      (data) => {
        if (stale) return;
        const shown = data.page === view.page ? key : viewKey({ ...view, page: data.page });
        if (shown !== key) window.history.replaceState(null, "", viewQuery({ ...view, page: data.page }, leadId) || window.location.pathname);
        setList({ key: shown, nonce, data, error: null });
      },
      (err) => !stale && setList((prev) => ({ ...prev, key, nonce, error: message(err) })),
    );
    return () => {
      stale = true;
    };
  }, [loading, key, nonce, view, leadId]);

  function patchLead(id: string, updates: Partial<Lead>) {
    setList((prev) => (prev.data ? { ...prev, data: { ...prev.data, leads: prev.data.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)) } } : prev));
  }

  return { list: list.data, error: list.key === key ? list.error : null, loading, refresh: () => setNonce((n) => n + 1), patchLead };
}

/**
 * The open lead (?lead=): from the list when it is there, else read on its own (a shared link). An unread lead is
 * marked read once when it opens, and the menu's unread number updates.
 */
export function useOpenLead(leadId: string | null, inList: Lead | undefined, initial: Lead | null, patchLead: (id: string, u: Partial<Lead>) => void) {
  const [extra, setExtra] = useState<{ id: string; lead: Lead | null } | null>(() =>
    initial ? { id: initial.id, lead: initial } : leadId ? { id: leadId, lead: null } : null,
  );
  const marked = useRef(new Set<string>());

  useEffect(() => {
    if (!leadId || inList || extra?.id === leadId) return;
    let stale = false;
    fetchJson<{ lead: Lead }>(`/api/internal/admin/leads?id=${leadId}`).then(
      (data) => !stale && setExtra({ id: leadId, lead: data.lead }),
      () => !stale && setExtra({ id: leadId, lead: null }),
    );
    return () => {
      stale = true;
    };
  }, [leadId, inList, extra?.id]);

  const selected = inList ?? (extra && extra.id === leadId ? extra.lead : null);
  const notFound = Boolean(leadId && !inList && extra?.id === leadId && !extra.lead);

  function patchOpen(id: string, updates: Partial<Lead>) {
    setExtra((prev) => (prev?.lead?.id === id ? { id, lead: { ...prev.lead, ...updates } } : prev));
  }

  const unreadId = selected && !selected.read_at ? selected.id : null;
  useEffect(() => {
    if (!unreadId || marked.current.has(unreadId)) return;
    marked.current.add(unreadId);
    appFetch("/api/internal/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: unreadId, mark_read: true }),
    })
      .then((res) => {
        if (!res.ok) return;
        const read = { read_at: new Date().toISOString() };
        patchLead(unreadId, read);
        patchOpen(unreadId, read);
        window.dispatchEvent(new Event(LEADS_CHANGED));
      })
      .catch(() => {});
    // patchLead only sets state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadId]);

  return { selected, notFound, patchOpen };
}
