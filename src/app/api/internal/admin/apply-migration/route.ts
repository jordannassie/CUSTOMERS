import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/internal/admin/apply-migration
 * Idempotently creates the feature_requests table if it doesn't exist.
 * Admin-only; uses service role.
 */
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();

  // Run idempotent DDL via rpc — using a raw SQL call through the REST API
  const { error } = await svc.rpc("exec_sql", {
    sql: `
      create table if not exists public.feature_requests (
        id          uuid        primary key default gen_random_uuid(),
        user_id     uuid        not null references auth.users(id) on delete cascade,
        business_id uuid        references public.businesses(id) on delete set null,
        title       text        not null check (char_length(trim(title)) >= 1 and char_length(title) <= 200),
        description text        not null check (char_length(trim(description)) >= 1 and char_length(description) <= 2000),
        page_context text,
        status      text        not null default 'new'
                                check (status in ('new', 'reviewing', 'planned', 'shipped', 'declined')),
        created_at  timestamptz not null default now()
      );
      create index if not exists feature_requests_user_id_idx    on public.feature_requests (user_id);
      create index if not exists feature_requests_status_idx     on public.feature_requests (status);
      create index if not exists feature_requests_created_at_idx on public.feature_requests (created_at desc);
      alter table public.feature_requests enable row level security;
    `,
  });

  if (error) {
    // exec_sql RPC may not exist — return the raw SQL so admin can paste it
    return NextResponse.json({ error: error.message, needsManual: true }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
