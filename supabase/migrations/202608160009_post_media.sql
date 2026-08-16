create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('video', 'audio')),
  object_key text not null unique check (char_length(object_key) between 1 and 500),
  public_url text not null check (char_length(public_url) between 1 and 1000),
  mime_type text not null check (char_length(mime_type) between 1 and 100),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  created_at timestamptz not null default now()
);

create index post_media_post_created_idx on public.post_media(post_id, created_at);

alter table public.post_media enable row level security;

create policy "Post media is publicly readable" on public.post_media
  for select to anon, authenticated using (true);

create policy "Authors attach media to their posts" on public.post_media
  for insert to authenticated with check (
    (select auth.uid()) = uploader_id
    and exists (
      select 1 from public.posts
      where id = post_id and author_id = (select auth.uid())
    )
  );

create policy "Authors remove their post media" on public.post_media
  for delete to authenticated using (
    (select auth.uid()) = uploader_id
    and exists (
      select 1 from public.posts
      where id = post_id and author_id = (select auth.uid())
    )
  );
