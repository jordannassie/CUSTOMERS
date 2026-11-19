// Pure rules for leads that the admin screen and the database code share (admin audit 2026-11-12). No server imports,
// so the Leads page in the browser uses the same rules.

/** "none" in the Handled by filter: leads nobody has taken yet. */
export const NO_HANDLER = "none";

/**
 * Where a lead stands, as the list badge and the Status filter say it. Status and "Mark as replied" were two systems
 * for one job, so they are read together here:
 * - new: nobody has opened or answered it yet
 * - opened: someone read it, nobody has answered yet
 * - contacted: marked as replied (older leads may still say status new), or set to Contacted
 * - qualified, closed, and older statuses as stored
 */
export type LeadStage = "new" | "opened" | "contacted" | (string & {});

export function leadStage(lead: { status: string; read_at: string | null; replied_at: string | null }): LeadStage {
  if (lead.status !== "new") return lead.status;
  if (lead.replied_at) return "contacted";
  return lead.read_at ? "opened" : "new";
}

/** The pipeline status a stage stands for, so the detail panel marks the right Status button. */
export function stageStatus(stage: LeadStage): string {
  return stage === "opened" ? "new" : stage;
}

/**
 * What one follow-up change writes. Marking a lead as replied also moves it from New to Contacted in the same update,
 * so the two never disagree; any other status is left as the admin set it.
 */
export function leadUpdates(
  change: {
    status?: string;
    markRead?: boolean;
    markUnread?: boolean;
    adminNotes?: string;
    handledBy?: string;
    replied?: boolean;
  },
  currentStatus: string | null,
  now: Date,
): {
  status?: string;
  read_at?: string | null;
  admin_notes?: string | null;
  handled_by?: string | null;
  replied_at?: string | null;
} {
  const updates: ReturnType<typeof leadUpdates> = {};
  if (change.status) updates.status = change.status;
  if (change.markRead) updates.read_at = now.toISOString();
  if (change.markUnread) updates.read_at = null;
  if (change.adminNotes !== undefined) updates.admin_notes = change.adminNotes || null;
  if (change.handledBy !== undefined) updates.handled_by = change.handledBy.toLowerCase() || null;
  if (change.replied !== undefined) updates.replied_at = change.replied ? now.toISOString() : null;
  if (change.replied && !change.status && currentStatus === "new") updates.status = "contacted";
  return updates;
}

/**
 * The search text as one quoted PostgREST value for an ilike filter: % and _ match themselves instead of anything,
 * and quoting keeps commas and brackets from changing the filter. null when there is nothing to search for.
 */
export function searchPattern(search: string): string | null {
  const text = search.replace(/\*/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const like = text.replace(/[\\%_]/g, (c) => `\\${c}`);
  return `"*${like.replace(/[\\"]/g, (c) => `\\${c}`)}*"`;
}
