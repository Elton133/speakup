create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text,
  bio text check (char_length(bio) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 40),
  body text not null check (char_length(body) between 1 and 1200),
  quote text check (char_length(quote) <= 800),
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 600),
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.saved_posts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index posts_created_at_idx on public.posts(created_at desc);
create index posts_topic_created_at_idx on public.posts(topic, created_at desc);
create index comments_post_created_at_idx on public.comments(post_id, created_at);
create index post_likes_post_id_idx on public.post_likes(post_id);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.saved_posts enable row level security;

create policy "Profiles are publicly readable" on public.profiles
  for select to anon, authenticated using (true);
create policy "Users update their profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Posts are publicly readable" on public.posts
  for select to anon, authenticated using (true);
create policy "Users create their posts" on public.posts
  for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Users update their posts" on public.posts
  for update to authenticated using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
create policy "Users delete their posts" on public.posts
  for delete to authenticated using ((select auth.uid()) = author_id);

create policy "Comments are publicly readable" on public.comments
  for select to anon, authenticated using (true);
create policy "Users create their comments" on public.comments
  for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Users update their comments" on public.comments
  for update to authenticated using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
create policy "Users delete their comments" on public.comments
  for delete to authenticated using ((select auth.uid()) = author_id);

create policy "Likes are publicly readable" on public.post_likes
  for select to anon, authenticated using (true);
create policy "Users create their likes" on public.post_likes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove their likes" on public.post_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their saved posts" on public.saved_posts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users save posts" on public.saved_posts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove saved posts" on public.saved_posts
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'SpeakUp member'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
