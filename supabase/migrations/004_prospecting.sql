-- Dedicated outbound prospecting data. Website leads remain in customers_direct_leads.
create table if not exists public.prospecting_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  search_query text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospecting_leads (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null unique,
  business_name text not null,
  category text,
  city text,
  state text,
  phone text,
  website text,
  address text,
  google_maps_url text,
  rating numeric,
  review_count integer,
  lead_score integer not null default 0,
  status text not null default 'New'
    check (status in (
      'New', 'Called', 'No Answer', 'Left Voicemail', 'Demo Offered',
      'Demo Sent', 'Interested', 'Follow Up', 'Booked Call', 'Won', 'Lost'
    )),
  contact_name text,
  contact_title text,
  contact_email text,
  contact_phone text,
  notes text,
  folder_id uuid references public.prospecting_folders(id) on delete set null,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospecting_leads_folder_id_idx
  on public.prospecting_leads (folder_id);
create index if not exists prospecting_leads_status_idx
  on public.prospecting_leads (status);
create index if not exists prospecting_leads_follow_up_idx
  on public.prospecting_leads (next_follow_up_at)
  where next_follow_up_at is not null;
create index if not exists prospecting_leads_created_at_idx
  on public.prospecting_leads (created_at desc);

alter table public.prospecting_folders enable row level security;
alter table public.prospecting_leads enable row level security;

-- No public policies: Customers Direct admin APIs use the service role.
