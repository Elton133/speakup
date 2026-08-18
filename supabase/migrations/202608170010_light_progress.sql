create table if not exists public.user_light_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  light_points integer not null default 0 check (light_points >= 0),
  last_lit_on date,
  updated_at timestamptz not null default now()
);

alter table public.user_light_progress enable row level security;
drop policy if exists "Members read their own light progress" on public.user_light_progress;
create policy "Members read their own light progress" on public.user_light_progress
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.record_light_activity(member_id uuid, earned_points integer)
returns void language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'utc')::date;
begin
  insert into public.user_light_progress (user_id, current_streak, longest_streak, light_points, last_lit_on)
  values (member_id, 1, 1, greatest(earned_points, 0), today)
  on conflict (user_id) do update set
    current_streak = case
      when user_light_progress.last_lit_on = today then user_light_progress.current_streak
      when user_light_progress.last_lit_on = today - 1 then user_light_progress.current_streak + 1
      else 1 end,
    longest_streak = greatest(user_light_progress.longest_streak, case
      when user_light_progress.last_lit_on = today then user_light_progress.current_streak
      when user_light_progress.last_lit_on = today - 1 then user_light_progress.current_streak + 1
      else 1 end),
    light_points = user_light_progress.light_points + greatest(earned_points, 0),
    last_lit_on = today,
    updated_at = now();
end;
$$;

create or replace function public.light_post_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.record_light_activity(new.author_id, 10); return new; end;
$$;
create or replace function public.light_comment_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.record_light_activity(new.author_id, 4); return new; end;
$$;
drop trigger if exists posts_light_progress on public.posts;
create trigger posts_light_progress after insert on public.posts
for each row execute function public.light_post_activity();
drop trigger if exists comments_light_progress on public.comments;
create trigger comments_light_progress after insert on public.comments
for each row execute function public.light_comment_activity();
