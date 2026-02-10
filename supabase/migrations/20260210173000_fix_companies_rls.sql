alter table public.companies enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'companies'
  loop
    execute format('drop policy if exists %I on public.companies', policy_row.policyname);
  end loop;
end;
$$;

create policy "companies_owner_all"
on public.companies
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "companies_client_read"
on public.companies
for select
using (auth.uid() = client_user_id);
