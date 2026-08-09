drop policy if exists "Users create reports" on public.reports;

create policy "Users report posts they do not own" on public.reports
  for insert to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and exists (
      select 1
      from public.posts
      where posts.id = reports.post_id
        and posts.author_id <> (select auth.uid())
    )
  );
