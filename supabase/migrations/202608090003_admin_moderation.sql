create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column account_status text not null default 'active'
  check (account_status in ('active', 'warned', 'suspended'));

alter table public.posts
  add column moderation_status text not null default 'visible'
  check (moderation_status in ('visible', 'hidden', 'removed')),
  add column moderation_reason text;

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles(id) on delete restrict,
  report_id uuid references public.reports(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('reviewing', 'resolved', 'dismissed', 'hidden', 'removed', 'warned', 'suspended')),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create index moderation_actions_created_idx on public.moderation_actions(created_at desc);
create index moderation_actions_report_idx on public.moderation_actions(report_id);

alter table public.user_roles enable row level security;
alter table public.moderation_actions enable row level security;

create or replace function public.is_moderator(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id and role in ('admin', 'moderator')
  );
$$;

create policy "Users read their role" on public.user_roles
  for select to authenticated using ((select auth.uid()) = user_id or public.is_moderator());
create policy "Moderators read actions" on public.moderation_actions
  for select to authenticated using (public.is_moderator());
create policy "Moderators create actions" on public.moderation_actions
  for insert to authenticated with check (
    public.is_moderator() and (select auth.uid()) = moderator_id
  );

drop policy if exists "Posts are publicly readable" on public.posts;
create policy "Visible posts are publicly readable" on public.posts
  for select to anon, authenticated using (
    moderation_status = 'visible'
    or (select auth.uid()) = author_id
    or public.is_moderator()
  );

drop policy if exists "Users create their posts" on public.posts;
create policy "Active users create their posts" on public.posts
  for insert to authenticated with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and account_status <> 'suspended'
    )
  );

drop policy if exists "Users create their comments" on public.comments;
create policy "Active users create their comments" on public.comments
  for insert to authenticated with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and account_status <> 'suspended'
    )
  );

drop policy if exists "Users create their likes" on public.post_likes;
create policy "Active users create their likes" on public.post_likes
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and account_status <> 'suspended'
    )
  );

create policy "Moderators read reports" on public.reports
  for select to authenticated using (public.is_moderator());
create policy "Moderators update reports" on public.reports
  for update to authenticated using (public.is_moderator())
  with check (public.is_moderator());

revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, bio, updated_at) on public.profiles to authenticated;
revoke update on public.posts from authenticated;
grant update (topic, body, quote, updated_at) on public.posts to authenticated;

create or replace function public.moderate_post(target_post_id uuid, new_status text, reason text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_moderator() then raise exception 'Not authorized'; end if;
  if new_status not in ('visible', 'hidden', 'removed') then raise exception 'Invalid status'; end if;
  update public.posts set moderation_status = new_status, moderation_reason = reason
  where id = target_post_id;
end;
$$;

create or replace function public.moderate_user(target_user_id uuid, new_status text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_moderator() then raise exception 'Not authorized'; end if;
  if new_status not in ('active', 'warned', 'suspended') then raise exception 'Invalid status'; end if;
  update public.profiles set account_status = new_status, updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.is_moderator(uuid) from public;
grant execute on function public.is_moderator(uuid) to authenticated;
revoke all on function public.moderate_post(uuid, text, text) from public;
revoke all on function public.moderate_user(uuid, text) from public;
grant execute on function public.moderate_post(uuid, text, text) to authenticated;
grant execute on function public.moderate_user(uuid, text) to authenticated;
