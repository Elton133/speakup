-- Post owners may change whether their public attribution is shown while editing.
-- Row-level security still limits updates to the post's author, and the
-- anonymous-account trigger still prevents anonymous auth identities leaking.

grant update (is_anonymous) on public.posts to authenticated;
