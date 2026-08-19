-- RLS policies were correctly configured from the start, but the base
-- Postgres table-level GRANTs to the authenticated and service_role roles
-- were never issued. RLS policies are only evaluated once a role already
-- has the underlying GRANT for that operation — without it, PostgREST
-- returns 403/permission-denied before RLS even runs. Discovered via
-- manual browser verification (get_advisors' security lint does not check
-- for this; it's a functional-completeness gap, not a security lint).

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.videos to authenticated;
grant select, insert, delete on public.video_watches to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.documents to service_role;
grant select, insert, update, delete on public.videos to service_role;
grant select, insert, update, delete on public.video_watches to service_role;
