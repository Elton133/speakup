-- Keep identity private for Supabase anonymous users, even if a client sends
-- is_anonymous = false. Anonymous users still use the authenticated role and
-- remain accountable through their private auth user id.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    case
      when new.is_anonymous then 'Anonymous member'
      else coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'display_name',
        split_part(new.email, '@', 1),
        'SpeakUp member'
      )
    end,
    case when new.is_anonymous then null else new.raw_user_meta_data ->> 'avatar_url' end
  );
  return new;
end;
$$;

create or replace function public.enforce_anonymous_attribution()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from auth.users
    where id = new.author_id and is_anonymous is true
  ) then
    new.is_anonymous := true;
  end if;
  return new;
end;
$$;

create trigger enforce_anonymous_post_attribution
  before insert or update of author_id, is_anonymous on public.posts
  for each row execute procedure public.enforce_anonymous_attribution();

create trigger enforce_anonymous_comment_attribution
  before insert or update of author_id, is_anonymous on public.comments
  for each row execute procedure public.enforce_anonymous_attribution();
