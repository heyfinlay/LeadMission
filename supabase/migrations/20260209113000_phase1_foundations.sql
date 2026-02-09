create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'audit_mode' and n.nspname = 'public'
  ) then
    create type public.audit_mode as enum ('in_app', 'prompt');
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  website_url text,
  industry text,
  stage text not null default 'Cold',
  priority text not null default 'Medium',
  score integer not null default 50 check (score >= 0 and score <= 100),
  notes text,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_user_id uuid references auth.users(id) on delete set null,
  client_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  status text not null default 'open',
  due_at timestamptz,
  priority text not null default 'medium',
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.website_scrapes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  url text not null,
  raw_text text,
  extracted_json jsonb not null default '{}'::jsonb,
  summary text,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'pending',
  mode public.audit_mode not null,
  prompt text,
  model_response text,
  summary text,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'draft',
  title text not null default 'Proposal',
  sections_json jsonb not null default '[]'::jsonb,
  html text,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.portal_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  portal_enabled boolean not null default false,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists companies_owner_idx on public.companies(owner_user_id);
create index if not exists companies_client_idx on public.companies(client_user_id);
create index if not exists contacts_company_idx on public.contacts(company_id);
create index if not exists contacts_owner_idx on public.contacts(owner_user_id);
create index if not exists tasks_company_idx on public.tasks(company_id);
create index if not exists tasks_owner_idx on public.tasks(owner_user_id);
create index if not exists website_scrapes_company_idx on public.website_scrapes(company_id);
create index if not exists website_scrapes_owner_idx on public.website_scrapes(owner_user_id);
create index if not exists audits_company_idx on public.audits(company_id);
create index if not exists audits_owner_idx on public.audits(owner_user_id);
create index if not exists proposals_company_idx on public.proposals(company_id);
create index if not exists proposals_owner_idx on public.proposals(owner_user_id);
create index if not exists portal_settings_owner_idx on public.portal_settings(owner_user_id);

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row
execute function public.set_updated_at();

drop trigger if exists portal_settings_set_updated_at on public.portal_settings;
create trigger portal_settings_set_updated_at
before update on public.portal_settings
for each row
execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.tasks enable row level security;
alter table public.website_scrapes enable row level security;
alter table public.audits enable row level security;
alter table public.proposals enable row level security;
alter table public.portal_settings enable row level security;

drop policy if exists "companies_owner_all" on public.companies;
create policy "companies_owner_all"
on public.companies
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "companies_client_read" on public.companies;
create policy "companies_client_read"
on public.companies
for select
using (
  client_user_id = auth.uid()
  and exists (
    select 1
    from public.portal_settings ps
    where ps.company_id = companies.id
      and ps.portal_enabled = true
  )
);

drop policy if exists "contacts_owner_all" on public.contacts;
create policy "contacts_owner_all"
on public.contacts
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "tasks_owner_all" on public.tasks;
create policy "tasks_owner_all"
on public.tasks
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "tasks_client_read" on public.tasks;
create policy "tasks_client_read"
on public.tasks
for select
using (
  exists (
    select 1
    from public.companies c
    join public.portal_settings ps on ps.company_id = c.id
    where c.id = tasks.company_id
      and c.client_user_id = auth.uid()
      and ps.portal_enabled = true
  )
);

drop policy if exists "website_scrapes_owner_all" on public.website_scrapes;
create policy "website_scrapes_owner_all"
on public.website_scrapes
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "audits_owner_all" on public.audits;
create policy "audits_owner_all"
on public.audits
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "audits_client_read" on public.audits;
create policy "audits_client_read"
on public.audits
for select
using (
  exists (
    select 1
    from public.companies c
    join public.portal_settings ps on ps.company_id = c.id
    where c.id = audits.company_id
      and c.client_user_id = auth.uid()
      and ps.portal_enabled = true
  )
);

drop policy if exists "proposals_owner_all" on public.proposals;
create policy "proposals_owner_all"
on public.proposals
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "proposals_client_read" on public.proposals;
create policy "proposals_client_read"
on public.proposals
for select
using (
  exists (
    select 1
    from public.companies c
    join public.portal_settings ps on ps.company_id = c.id
    where c.id = proposals.company_id
      and c.client_user_id = auth.uid()
      and ps.portal_enabled = true
  )
);

drop policy if exists "portal_settings_owner_all" on public.portal_settings;
create policy "portal_settings_owner_all"
on public.portal_settings
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "portal_settings_client_read" on public.portal_settings;
create policy "portal_settings_client_read"
on public.portal_settings
for select
using (
  exists (
    select 1
    from public.companies c
    where c.id = portal_settings.company_id
      and c.client_user_id = auth.uid()
      and portal_settings.portal_enabled = true
  )
);

grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.website_scrapes to authenticated;
grant select, insert, update, delete on public.audits to authenticated;
grant select, insert, update, delete on public.proposals to authenticated;
grant select, insert, update, delete on public.portal_settings to authenticated;

