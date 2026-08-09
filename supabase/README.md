# SpeakUp backend setup

1. Create a Supabase project.
2. Run `migrations/202608090001_initial_community.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and add the project URL and publishable key.
4. In Supabase Authentication > Providers > Google, enable Google and add the Google client ID and secret.
5. In Google Auth Platform, add the Supabase callback URL shown on that provider page.
6. In Supabase URL Configuration, set the site URL and allow `http://localhost:3000/auth/callback` during development.

Anonymous posts still require an authenticated account. `is_anonymous` controls public attribution; the owner remains available for moderation and account-level abuse controls.

## Create the first administrator

After applying `202608090003_admin_moderation.sql`, run this once in the SQL editor using your Google account email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com'
on conflict (user_id) do update set role = excluded.role;
```
