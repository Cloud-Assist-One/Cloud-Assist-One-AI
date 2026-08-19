-- Add a private.is_enabled() helper, mirroring private.is_admin()'s pattern,
-- and use it to close the gap where an already-issued access token keeps
-- working after an admin disables the account (the auth-level ban only
-- blocks new sign-ins, not tokens issued before the ban).

create or replace function private.is_enabled()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and disabled_at is null
  );
$$;

revoke execute on function private.is_enabled() from public, anon;
grant execute on function private.is_enabled() to authenticated;

drop policy "documents_select_authenticated" on public.documents;
create policy "documents_select_authenticated"
  on public.documents for select
  to authenticated
  using ((select private.is_enabled()));

drop policy "videos_select_authenticated" on public.videos;
create policy "videos_select_authenticated"
  on public.videos for select
  to authenticated
  using ((select private.is_enabled()));

drop policy "training_documents_select_authenticated" on storage.objects;
create policy "training_documents_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'training-documents' and (select private.is_enabled()));

drop policy "training_videos_select_authenticated" on storage.objects;
create policy "training_videos_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'training-videos' and (select private.is_enabled()));
