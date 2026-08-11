alter table public.comments
  add column parent_comment_id uuid references public.comments(id) on delete cascade;

create index comments_parent_created_idx
  on public.comments(parent_comment_id, created_at);

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_likes_comment_id_idx on public.comment_likes(comment_id);

alter table public.comment_likes enable row level security;

create policy "Comment likes are publicly readable" on public.comment_likes
  for select to anon, authenticated using (true);
create policy "Active users like comments" on public.comment_likes
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and account_status <> 'suspended'
    )
  );
create policy "Users remove their comment likes" on public.comment_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comment_likes'
  ) then
    alter publication supabase_realtime add table public.comment_likes;
  end if;
end $$;

create or replace function public.notify_comment_interaction()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  comment_owner_id uuid;
  related_post_id uuid;
begin
  select author_id, post_id into comment_owner_id, related_post_id
  from public.comments where id = new.comment_id;
  if comment_owner_id is null or comment_owner_id = new.user_id then return new; end if;
  insert into public.notifications (recipient_id, actor_id, post_id, kind, message)
  values (
    comment_owner_id,
    new.user_id,
    related_post_id,
    'like',
    'Someone appreciated your response in a conversation.'
  );
  return new;
end;
$$;

create trigger on_comment_liked
  after insert on public.comment_likes
  for each row execute procedure public.notify_comment_interaction();

create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  owner_id uuid;
  parent_owner_id uuid;
begin
  select author_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.author_id then
    insert into public.notifications (recipient_id, actor_id, post_id, kind, message)
    values (owner_id, new.author_id, new.post_id, 'comment', 'Someone joined the conversation on your thought.');
  end if;

  if new.parent_comment_id is not null then
    select author_id into parent_owner_id from public.comments where id = new.parent_comment_id;
    if parent_owner_id is not null
      and parent_owner_id <> new.author_id
      and parent_owner_id is distinct from owner_id then
      insert into public.notifications (recipient_id, actor_id, post_id, kind, message)
      values (parent_owner_id, new.author_id, new.post_id, 'comment', 'Someone replied to your response.');
    end if;
  end if;
  return new;
end;
$$;
