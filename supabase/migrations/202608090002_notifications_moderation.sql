create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete cascade,
  kind text not null check (kind in ('comment', 'like', 'community')),
  message text not null check (char_length(message) between 1 and 240),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'misinformation', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, post_id)
);

create index notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
create index reports_status_created_idx on public.reports(status, created_at desc);

alter table public.notifications enable row level security;
alter table public.reports enable row level security;

create policy "Users read their notifications" on public.notifications
  for select to authenticated using ((select auth.uid()) = recipient_id);
create policy "Users update their notifications" on public.notifications
  for update to authenticated using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

create policy "Users create reports" on public.reports
  for insert to authenticated with check ((select auth.uid()) = reporter_id);
create policy "Users read their reports" on public.reports
  for select to authenticated using ((select auth.uid()) = reporter_id);

create or replace function public.notify_post_interaction()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  owner_id uuid;
begin
  select author_id into owner_id from public.posts where id = new.post_id;
  if owner_id is null or owner_id = new.user_id then return new; end if;
  insert into public.notifications (recipient_id, actor_id, post_id, kind, message)
  values (owner_id, new.user_id, new.post_id, 'like', 'Someone carried your thought forward.');
  return new;
end;
$$;

create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  owner_id uuid;
begin
  select author_id into owner_id from public.posts where id = new.post_id;
  if owner_id is null or owner_id = new.author_id then return new; end if;
  insert into public.notifications (recipient_id, actor_id, post_id, kind, message)
  values (owner_id, new.author_id, new.post_id, 'comment', 'Someone joined the conversation on your thought.');
  return new;
end;
$$;

create trigger on_post_liked
  after insert on public.post_likes
  for each row execute procedure public.notify_post_interaction();
create trigger on_post_commented
  after insert on public.comments
  for each row execute procedure public.notify_post_comment();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) then alter publication supabase_realtime add table public.posts; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then alter publication supabase_realtime add table public.comments; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_likes'
  ) then alter publication supabase_realtime add table public.post_likes; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then alter publication supabase_realtime add table public.notifications; end if;
end $$;
