create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 80),
  message text not null check (char_length(message) between 1 and 240),
  destination_url text not null default '/community?view=notices',
  sent_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.announcements enable row level security;

create policy "Users manage their push subscriptions" on public.push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Moderators read announcements" on public.announcements
  for select to authenticated using (public.is_moderator());
