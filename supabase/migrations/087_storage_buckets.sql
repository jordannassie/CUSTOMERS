-- 087: every storage bucket and its access rules are kept here, not only in the Supabase dashboard (BUG-284).
--
-- 020 recorded the dashboard's business-logos and STORAGE buckets with "on conflict do nothing", so their limits were
-- whatever the dashboard said and could not be checked. (Its note names /api/geo/businesses/logo; logos are now
-- uploaded by the settings page, src/modules/settings/dal.ts.) This file sets each bucket outright.
--
-- Access: the app reads and writes storage only with the service role, after its own ownership checks. Files in a
-- public bucket are served by their public URL without row level security. So signed-in users and visitors need no
-- policy on storage.objects for these buckets, and none is allowed: any policy made by hand in the dashboard that
-- names one of them is dropped below, with a notice naming it.
--   business-logos  public. Agency logos for reports, written by the server only. PNG, JPEG or WebP up to 2 MB, the
--                   same limits as the upload check (settings/service.ts LOGO_MAX_BYTES); no SVG, which can carry
--                   script.
--   reports         private. Report PDFs, read only through 10-minute signed URLs (080).
--   STORAGE         public, from the old app; kept as it is until a backup shows it is empty (docs/launch/BACKUPS.md).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-logos', 'business-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public)
values ('STORAGE', 'STORAGE', true)
on conflict (id) do nothing;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '(business-logos|''reports''|''STORAGE'')'
  loop
    raise notice 'Dropping storage policy made outside the migrations: %', p.policyname;
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end;
$$;
