# Training Portal — Design Spec

## Overview

A login-gated training portal for Cloud Assist One AI, added to the existing marketing site (Next.js/Vercel). The site owner (admin) uploads documents and videos; the owner also creates, disables, enables, and deletes user accounts. Logged-in users browse a Documents tab (file listing, download) and a Videos tab (2-column grid, click to play) and can mark videos as watched.

This is phase 2 of the project (the v1 marketing site explicitly deferred "no database, no auth, no user accounts" — see `docs/PRD.md`). It's the first phase to add a backend.

## Goals

- Let the admin upload training documents and videos and manage who can access them.
- Let invited users log in with an email/password the admin sets up for them, view/download documents, and watch videos.
- Let users track which videos they've watched.
- Give the admin a simple in-app tool to create, disable, enable, and delete user accounts — no separate admin console needed.

## Non-goals (this phase)

- No public self-signup — accounts are created only by the admin.
- No categories/folders for content — flat list/grid, newest first.
- No automatic "watched" detection from video playback — manual toggle only.
- No audit log, bulk upload, or search/filter — flagged as future work, not built now.
- No changes to the existing public marketing pages beyond adding one "Login" nav link.

## Architecture

- **Stack addition**: Supabase (Postgres + Auth + Storage), using the existing empty Supabase project ("Project One", `fqisispaeuannhmzjpow`). `@supabase/supabase-js` and `@supabase/ssr` added as dependencies.
- **Routing**: everything lives under `/portal` in the existing Next.js App Router app. Next.js middleware protects all `/portal/*` routes except the login view itself, redirecting unauthenticated requests to the login form.
- **Client/server split**: browser code only ever talks to Supabase using the public anon key (subject to RLS). Admin user-management actions (create/disable/enable/delete) run as Next.js server route handlers using the Supabase service-role key, which never reaches the client bundle.

## Data model

All new tables live in the `public` schema of the existing Supabase project.

### `profiles`
| column | type | notes |
|---|---|---|
| `id` | uuid, PK | FK → `auth.users.id` |
| `email` | text | denormalized copy for convenient display/admin listing |
| `role` | text | `'admin'` \| `'user'`, default `'user'` |
| `disabled_at` | timestamptz, nullable | set when admin disables the account |
| `created_at` | timestamptz | default `now()` |

Populated automatically by a Postgres trigger on `auth.users` insert, so the app never has to keep two identities in sync. The admin's own account is promoted to `role='admin'` via a one-time manual update after the first account is created.

### `documents`
| column | type | notes |
|---|---|---|
| `id` | uuid, PK | default `gen_random_uuid()` |
| `title` | text | shown in the listing |
| `storage_path` | text | path within the `training-documents` bucket |
| `file_size` | bigint | bytes, for display |
| `content_type` | text | MIME type |
| `uploaded_by` | uuid | FK → `profiles.id` |
| `created_at` | timestamptz | default `now()` |

### `videos`
| column | type | notes |
|---|---|---|
| `id` | uuid, PK | default `gen_random_uuid()` |
| `title` | text | shown under the thumbnail |
| `storage_path` | text | path within the `training-videos` bucket |
| `thumbnail_path` | text, nullable | path within `training-videos`; null shows a generic placeholder thumbnail |
| `uploaded_by` | uuid | FK → `profiles.id` |
| `created_at` | timestamptz | default `now()` |

### `video_watches`
| column | type | notes |
|---|---|---|
| `user_id` | uuid | FK → `profiles.id`, part of composite PK |
| `video_id` | uuid | FK → `videos.id`, part of composite PK |
| `watched_at` | timestamptz | default `now()` |

Row presence = watched. Toggling "unwatched" deletes the row.

### Storage buckets
- `training-documents` — private.
- `training-videos` — private; holds both video files and their optional thumbnail images.

All file access goes through short-lived signed URLs generated server-side; nothing in either bucket is reachable by a guessed URL.

## Row Level Security

- `profiles`: a user can `SELECT` their own row; admins can `SELECT`/`UPDATE` all rows. No client-side `INSERT`/`DELETE` (handled server-side via the trigger and the admin API).
- `documents`, `videos`: any authenticated user whose `profiles.disabled_at IS NULL` can `SELECT`. Only `role='admin'` can `INSERT`/`UPDATE`/`DELETE`.
- `video_watches`: a user can `SELECT`/`INSERT`/`DELETE` only rows where `user_id = auth.uid()`.
- Storage bucket policies mirror the `documents`/`videos` table policies (authenticated+enabled read, admin-only write), keyed off the same `profiles.role` check.

## Auth flows

- **Login**: standard Supabase email/password sign-in. On success, redirect into `/portal`.
- **Forgot password**: "Forgot password?" link triggers Supabase's built-in password-reset email, which lands the user on a "set new password" page.
- **Disabled account**: a disabled user who correctly authenticates is immediately signed back out and shown "Your account has been disabled — contact your administrator," rather than seeing any content.
- **Admin account creation**: admin fills in email + initial password (with a "generate" button for a random strong password) in the Admin tab; this calls a server route using the Supabase Admin API (`auth.admin.createUser`) with `email_confirm: true` so the account is immediately usable. The admin is responsible for relaying the initial password to the user out-of-band (e.g. a phone call or separate email); no email is auto-sent at creation time, to keep this phase simple.
- **Disable/Enable**: server route calls `auth.admin.updateUserById` to set/clear a ban, and updates `profiles.disabled_at` to match.
- **Delete**: server route calls `auth.admin.deleteUserById` after a confirmation step in the UI; cascades remove the `profiles` row (and any `video_watches` rows) via FK `ON DELETE CASCADE`.

## Portal UI

- **Top nav**: existing marketing site header (`components/Header.tsx`) gets one more link, "Login", pointing to `/portal`.
- **`/portal` — logged out**: centered email/password form + "Forgot password?" link. No portal content or nav chrome is rendered for unauthenticated visitors.
- **`/portal` — logged in**: two tabs by default:
  - **Documents**: list of title, file size, upload date, and a Download button that fetches a signed URL and triggers the browser download.
  - **Videos**: responsive 2-column grid; each card shows the thumbnail (or placeholder), title, and a watched/unwatched badge. Clicking the thumbnail opens a modal video player using a signed URL. Each card also has a "Mark as watched" / "Mark as unwatched" toggle button, independent of playback.
  - A third **Admin** tab appears only when `profiles.role === 'admin'`:
    - User list: email, status (Active/Disabled), created date, with Create / Disable / Enable / Delete actions (Delete requires a confirmation dialog).
    - Upload forms for documents (title + file) and videos (title + video file + optional thumbnail image).

## Environment & deployment

New env vars (server-only unless prefixed `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used exclusively in route handlers, never imported into client components.

Added to `.env.local` (already gitignored) and documented with placeholders in `.env.local.example`. Same three vars need to be added to the Vercel project's environment variables before/at deploy time.

Deploy target: push to `main` on `https://github.com/Cloud-Assist-One/Cloud-Assist-One-AI`, deployed via the existing Vercel project (`cloud-assist-one-6u8uh21kw-cloud-assist-one.vercel.app`).

## Testing

- Unit/component tests (Jest + Testing Library, matching existing project conventions) for: login form validation, tab switching, admin user-list actions (mocking the Supabase client), document list rendering, video grid rendering and watched-toggle state.
- RLS policies verified manually via Supabase SQL editor / MCP (`get_advisors` for security lint) after migration.
- Manual end-to-end pass in a real browser before calling the feature done: create a user as admin, log in as that user, download a document, play a video, toggle watched, disable the user and confirm they're locked out, re-enable, delete.

## Future work (explicitly out of scope now)

- Audit log of admin actions.
- Automatic "watched" detection from video playback (currently manual toggle only).
- Search/filter and categories/folders once the library grows.
- Bulk upload.
- Emailed invite flow instead of admin manually relaying the initial password.
