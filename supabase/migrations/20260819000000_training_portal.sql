-- Private schema for internal helper functions (not exposed via the API)
create schema if not exists private;

-- Profiles -------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using ((select private.is_admin()));

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using ((select private.is_admin()));

-- Documents --------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null,
  file_size bigint not null,
  content_type text not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index documents_created_at_idx on public.documents (created_at desc);

alter table public.documents enable row level security;

create policy "documents_select_authenticated"
  on public.documents for select
  to authenticated
  using (true);

create policy "documents_insert_admin"
  on public.documents for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "documents_update_admin"
  on public.documents for update
  to authenticated
  using ((select private.is_admin()));

create policy "documents_delete_admin"
  on public.documents for delete
  to authenticated
  using ((select private.is_admin()));

-- Videos -------------------------------------------------------------------

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null,
  thumbnail_path text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index videos_created_at_idx on public.videos (created_at desc);

alter table public.videos enable row level security;

create policy "videos_select_authenticated"
  on public.videos for select
  to authenticated
  using (true);

create policy "videos_insert_admin"
  on public.videos for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "videos_update_admin"
  on public.videos for update
  to authenticated
  using ((select private.is_admin()));

create policy "videos_delete_admin"
  on public.videos for delete
  to authenticated
  using ((select private.is_admin()));

-- Video watches --------------------------------------------------------------

create table public.video_watches (
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index video_watches_user_id_idx on public.video_watches (user_id);
create index video_watches_video_id_idx on public.video_watches (video_id);

alter table public.video_watches enable row level security;

create policy "video_watches_select_own"
  on public.video_watches for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "video_watches_insert_own"
  on public.video_watches for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "video_watches_delete_own"
  on public.video_watches for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Storage buckets --------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('training-documents', 'training-documents', false),
  ('training-videos', 'training-videos', false)
on conflict (id) do nothing;

create policy "training_documents_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'training-documents');

create policy "training_documents_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'training-documents' and (select private.is_admin()));

create policy "training_documents_update_admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'training-documents' and (select private.is_admin()));

create policy "training_documents_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'training-documents' and (select private.is_admin()));

create policy "training_videos_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'training-videos');

create policy "training_videos_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'training-videos' and (select private.is_admin()));

create policy "training_videos_update_admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'training-videos' and (select private.is_admin()));

create policy "training_videos_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'training-videos' and (select private.is_admin()));
