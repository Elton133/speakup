create table if not exists public.blocked_members (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocked_members enable row level security;
drop policy if exists "Members manage their blocks" on public.blocked_members;
create policy "Members manage their blocks" on public.blocked_members
  for all to authenticated
  using ((select auth.uid()) = blocker_id)
  with check ((select auth.uid()) = blocker_id);
