-- Private What I Owe records per authenticated Finance email.
-- This table is not part of the shared household finance document.
create table if not exists public.finance_personal_owed (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 creditor text not null check (char_length(trim(creditor)) between 1 and 160),
 description text not null default '' check (char_length(description)<=350),
 original_cents bigint not null check (original_cents>0 and original_cents<=99999999999),
 paid_cents bigint not null default 0 check (paid_cents>=0 and paid_cents<=original_cents),
 due_date date,
 notes text not null default '' check (char_length(notes)<=1200),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.finance_personal_owed enable row level security;
revoke all on public.finance_personal_owed from public,anon,authenticated;
grant select,insert,update,delete on public.finance_personal_owed to authenticated;
create index if not exists finance_personal_owed_owner_idx on public.finance_personal_owed(user_id,due_date);
drop policy if exists finance_owed_read_own on public.finance_personal_owed;
drop policy if exists finance_owed_add_own on public.finance_personal_owed;
drop policy if exists finance_owed_update_own on public.finance_personal_owed;
drop policy if exists finance_owed_delete_own on public.finance_personal_owed;
create policy finance_owed_read_own on public.finance_personal_owed for select to authenticated using (user_id=(select auth.uid()));
create policy finance_owed_add_own on public.finance_personal_owed for insert to authenticated with check (user_id=(select auth.uid()));
create policy finance_owed_update_own on public.finance_personal_owed for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy finance_owed_delete_own on public.finance_personal_owed for delete to authenticated using (user_id=(select auth.uid()));
create or replace function public.finance_personal_owed_touch()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end $$;
revoke execute on function public.finance_personal_owed_touch() from public,anon;
drop trigger if exists finance_personal_owed_updated on public.finance_personal_owed;
create trigger finance_personal_owed_updated before update on public.finance_personal_owed
 for each row execute function public.finance_personal_owed_touch();
