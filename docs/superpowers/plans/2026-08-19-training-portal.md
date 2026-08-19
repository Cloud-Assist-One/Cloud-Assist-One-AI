# Training Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a login-gated training portal (`/portal`) to the Cloud Assist One AI marketing site, backed by Supabase, where the admin uploads documents/videos and manages user accounts, and logged-in users browse/download documents, watch videos, and mark videos watched.

**Architecture:** Next.js App Router routes and client components talk to Supabase directly using the public anon key, protected entirely by Postgres Row Level Security — no app-level authorization logic needed for content reads/writes. The one exception is user account management (create/disable/enable/delete), which touches `auth.users` and must run server-side with the Supabase service-role key; those routes re-verify the caller is an admin on every request (defense in depth — Next.js Proxy alone is not a reliable security boundary per Next.js's own guidance).

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/supabase-js`, `@supabase/ssr`, Supabase Postgres/Auth/Storage, Jest + Testing Library (existing project conventions).

**Spec:** `docs/superpowers/specs/2026-08-19-training-portal-design.md`

## Global Constraints

- Supabase project: `fqisispaeuannhmzjpow` ("Project One", already provisioned, currently empty).
- No public self-signup — accounts are created only by an admin via the in-app Admin tab.
- All file access goes through short-lived signed URLs; the `training-documents` and `training-videos` storage buckets are private.
- The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is server-only and must never be imported into a Client Component or shipped to the browser bundle.
- This Next.js version renames `middleware.ts` to `proxy.ts` (exported function `proxy`, not `middleware`) — confirmed against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. Do not create a `middleware.ts` file.
- Route Handler dynamic params are async (`await params`), per `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`.
- Follow existing project conventions: CSS Modules per component, `@/*` path alias, tests co-located as `Component.test.tsx`, functional components with hooks, 2-space indentation, ES modules.
- "Mark as watched" is a manual toggle only (no video-player event wiring) — confirmed in the design spec.

---

## Task 1: Supabase dependencies, client helpers, and environment config

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `lib/portal/types.ts`
- Modify: `.env.local` (gitignored — not committed)
- Modify: `.env.local.example`

**Interfaces:**
- Produces: `createClient()` (browser, from `lib/supabase/client.ts`), `createClient()` (server/async, from `lib/supabase/server.ts`), `createAdminClient()` (from `lib/supabase/admin.ts`), and the shared types `Profile`, `Document`, `Video` from `lib/portal/types.ts` — every later task imports one or more of these.

- [ ] **Step 1: Install the Supabase packages**

Run: `npm install @supabase/supabase-js @supabase/ssr`

- [ ] **Step 2: Create the shared portal types**

`lib/portal/types.ts`:
```ts
export type ProfileRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  role: ProfileRole;
  disabled_at: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  storage_path: string;
  file_size: number;
  content_type: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  storage_path: string;
  thumbnail_path: string | null;
  uploaded_by: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Create the browser Supabase client**

`lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Create the server Supabase client**

`lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called during a Server Component render, which can't set
            // cookies. proxy.ts refreshes the session on the next request.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 5: Create the admin (service-role) Supabase client**

`lib/supabase/admin.ts`:
```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

These three client factories are thin wrappers around the Supabase SDK with no branching logic of their own — no dedicated unit test, consistent with not testing a plain getter. Their behavior is exercised indirectly by every later task's tests (which mock `createClient`) and by the manual end-to-end pass in Task 12.

- [ ] **Step 6: Fetch the project URL and anon key and write `.env.local`**

Run `mcp__supabase__get_project_url` with `project_id: "fqisispaeuannhmzjpow"` and `mcp__supabase__get_publishable_keys` with the same `project_id`. Write the results into `.env.local` (create if it doesn't already have these lines), alongside the existing `NEXT_PUBLIC_FORM_ENDPOINT`:

```
NEXT_PUBLIC_FORM_ENDPOINT=https://formspree.io/f/your-form-id
NEXT_PUBLIC_SUPABASE_URL=<value from get_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<value from get_publishable_keys>
SUPABASE_SERVICE_ROLE_KEY=
```

Leave `SUPABASE_SERVICE_ROLE_KEY` blank for now — the service-role secret is deliberately not retrievable via MCP tools. Before Task 7 (admin user management) can be manually verified, open the Supabase dashboard → Project Settings → API → and copy the `service_role` secret key into this line yourself.

- [ ] **Step 7: Update `.env.local.example` with placeholders**

`.env.local.example`:
```
NEXT_PUBLIC_FORM_ENDPOINT=https://formspree.io/f/your-form-id
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 8: Verify the project still type-checks and builds**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json lib/supabase lib/portal .env.local.example
git commit -m "Add Supabase client helpers and portal types"
```

---

## Task 2: Database schema, RLS policies, and storage buckets

**Files:**
- Create: `supabase/migrations/20260819000000_training_portal.sql`

**Interfaces:**
- Produces: tables `public.profiles`, `public.documents`, `public.videos`, `public.video_watches`; storage buckets `training-documents`, `training-videos`; helper `private.is_admin()`. Every later task's queries assume this exact schema.

- [ ] **Step 1: Write the migration file**

`supabase/migrations/20260819000000_training_portal.sql`:
```sql
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
```

`documents`/`videos` select policies use `using (true)` rather than checking `disabled_at`: a disabled account is banned at the Supabase Auth level (Task 7), so it can never obtain a valid session in the first place — there's nothing left for RLS to block.

- [ ] **Step 2: Apply the migration**

Call `mcp__supabase__apply_migration` with `project_id: "fqisispaeuannhmzjpow"`, `name: "training_portal"`, and `query` set to the full SQL above.

- [ ] **Step 3: Verify with the security advisor**

Call `mcp__supabase__get_advisors` with `project_id: "fqisispaeuannhmzjpow"` and `type: "security"`.
Expected: no new warnings referencing `profiles`, `documents`, `videos`, `video_watches`, or the two new storage buckets. If something is flagged, fix the migration and re-apply before moving on.

- [ ] **Step 4: Confirm the tables exist**

Call `mcp__supabase__list_tables` with `project_id: "fqisispaeuannhmzjpow"`, `schemas: ["public"]`.
Expected: `profiles`, `documents`, `videos`, `video_watches` are listed.

- [ ] **Step 5: Bootstrap the first admin account (manual, one-time)**

This can't be done through the app itself — the Admin tab (Task 7) requires an existing admin to access it. Ask the site owner for the email/password they want for their own login, then:

1. In the Supabase dashboard, go to Authentication → Users → Add user, and create that account with "Auto Confirm User" checked. This fires the `on_auth_user_created` trigger, which creates a matching `profiles` row with `role = 'user'`.
2. Promote it to admin: call `mcp__supabase__execute_sql` with `project_id: "fqisispaeuannhmzjpow"` and:
   ```sql
   update public.profiles set role = 'admin' where email = '<their email>';
   ```
3. Verify: `select id, email, role from public.profiles where email = '<their email>';` should show `role = 'admin'`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260819000000_training_portal.sql
git commit -m "Add training portal database schema, RLS policies, and storage buckets"
```

---

## Task 3: Login form

**Files:**
- Create: `components/portal/LoginForm.tsx`
- Create: `components/portal/LoginForm.module.css`
- Create: `components/portal/LoginForm.test.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client` (Task 1).
- Produces: `LoginForm` (default export, no props) — consumed by `app/portal/page.tsx` in Task 10.

- [ ] **Step 1: Write the failing test**

`components/portal/LoginForm.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

const signInWithPassword = jest.fn();
const resetPasswordForEmail = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args),
    },
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    resetPasswordForEmail.mockReset();
  });

  it('signs in with the entered email and password', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correct-horse');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'trainee@example.com',
      password: 'correct-horse',
    });
  });

  it('shows an error when sign-in fails', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'trainee@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
  });

  it('sends a password reset email when "Forgot password?" is clicked', async () => {
    resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'trainee@example.com');
    await user.click(screen.getByRole('button', { name: /forgot password/i }));

    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'trainee@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/portal/reset-password') })
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/reset email sent/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest components/portal/LoginForm.test.tsx`
Expected: FAIL — `Cannot find module './LoginForm'`.

- [ ] **Step 3: Write the component**

`components/portal/LoginForm.tsx`:
```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './LoginForm.module.css';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResetSent(false);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (signInError) {
      setError('Invalid email or password, or your account has been disabled.');
      return;
    }

    router.refresh();
  }

  async function handleResetPassword() {
    if (!email) {
      setError('Enter your email above first, then click "Forgot password?"');
      return;
    }

    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal/reset-password`,
    });

    if (resetError) {
      setError('Could not send the reset email. Please try again.');
      return;
    }

    setResetSent(true);
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h1>Training Portal Login</h1>

        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {resetSent && (
          <p role="status" className={styles.status}>
            Password reset email sent — check your inbox.
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <button type="button" className={styles.linkButton} onClick={handleResetPassword}>
          Forgot password?
        </button>
      </form>
    </div>
  );
}
```

`components/portal/LoginForm.module.css`:
```css
.wrapper {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 24rem;
}

.form h1 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.form label {
  font-weight: 600;
}

.form input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font: inherit;
  background: var(--color-bg);
  color: var(--color-fg);
}

.form input:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.error {
  color: #d1274b;
  font-size: 0.875rem;
}

.status {
  color: var(--color-fg);
  font-size: 0.875rem;
}

.submit {
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font: inherit;
}

.submit:hover:not(:disabled) {
  filter: brightness(0.9);
}

.submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.linkButton {
  background: none;
  border: none;
  color: var(--color-accent);
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
  padding: 0;
  align-self: flex-start;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest components/portal/LoginForm.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/portal/LoginForm.tsx components/portal/LoginForm.module.css components/portal/LoginForm.test.tsx
git commit -m "Add portal login form"
```

---

## Task 4: Password reset form and page

**Files:**
- Create: `components/portal/ResetPasswordForm.tsx`
- Create: `components/portal/ResetPasswordForm.module.css`
- Create: `components/portal/ResetPasswordForm.test.tsx`
- Create: `app/portal/reset-password/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client` (Task 1).
- Produces: `ResetPasswordForm` (default export, no props), rendered by `app/portal/reset-password/page.tsx`.

- [ ] **Step 1: Write the failing test**

`components/portal/ResetPasswordForm.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordForm from './ResetPasswordForm';

const updateUser = jest.fn();
const push = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      updateUser: (...args: unknown[]) => updateUser(...args),
    },
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => push(...args) }),
}));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    updateUser.mockReset();
    push.mockReset();
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'short');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/i);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('updates the password and redirects to the portal on success', async () => {
    updateUser.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'a-long-enough-password');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    expect(updateUser).toHaveBeenCalledWith({ password: 'a-long-enough-password' });
    expect(await screen.findByRole('status')).toHaveTextContent(/updated/i);
    expect(push).toHaveBeenCalledWith('/portal');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest components/portal/ResetPasswordForm.test.tsx`
Expected: FAIL — `Cannot find module './ResetPasswordForm'`.

- [ ] **Step 3: Write the component and page**

`components/portal/ResetPasswordForm.tsx`:
```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './ResetPasswordForm.module.css';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    router.push('/portal');
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h1>Set a new password</h1>

        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {done && (
          <p role="status" className={styles.status}>
            Password updated — redirecting…
          </p>
        )}

        <button type="submit" className={styles.submit}>
          Set password
        </button>
      </form>
    </div>
  );
}
```

`components/portal/ResetPasswordForm.module.css`:
```css
.wrapper {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 24rem;
}

.form label {
  font-weight: 600;
}

.form input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font: inherit;
  background: var(--color-bg);
  color: var(--color-fg);
}

.error {
  color: #d1274b;
  font-size: 0.875rem;
}

.status {
  font-size: 0.875rem;
}

.submit {
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font: inherit;
}

.submit:hover {
  filter: brightness(0.9);
}
```

`app/portal/reset-password/page.tsx`:
```tsx
import ResetPasswordForm from '@/components/portal/ResetPasswordForm';

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest components/portal/ResetPasswordForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/portal/ResetPasswordForm.tsx components/portal/ResetPasswordForm.module.css components/portal/ResetPasswordForm.test.tsx app/portal/reset-password/page.tsx
git commit -m "Add password reset form and page"
```

---

## Task 5: Documents tab

**Files:**
- Create: `components/portal/DocumentsTab.tsx`
- Create: `components/portal/DocumentsTab.module.css`
- Create: `components/portal/DocumentsTab.test.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client` (Task 1), `Document` type from `@/lib/portal/types` (Task 1).
- Produces: `DocumentsTab` (default export, no props) — consumed by `PortalTabs` in Task 9.

- [ ] **Step 1: Write the failing test**

`components/portal/DocumentsTab.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentsTab from './DocumentsTab';

const order = jest.fn();
const createSignedUrl = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: (...args: unknown[]) => order(...args),
      }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => createSignedUrl(...args),
      }),
    },
  }),
}));

describe('DocumentsTab', () => {
  beforeEach(() => {
    order.mockReset();
    createSignedUrl.mockReset();
  });

  it('shows an empty state when there are no documents', async () => {
    order.mockResolvedValueOnce({ data: [] });
    render(<DocumentsTab />);

    expect(await screen.findByText(/no documents available/i)).toBeInTheDocument();
  });

  it('lists documents and triggers a download via a signed URL', async () => {
    order.mockResolvedValueOnce({
      data: [
        {
          id: 'doc-1',
          title: 'Getting Started Guide',
          storage_path: 'abc/guide.pdf',
          file_size: 2048,
          content_type: 'application/pdf',
          uploaded_by: 'admin-1',
          created_at: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    createSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: 'https://example.com/signed/guide.pdf' },
      error: null,
    });

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<DocumentsTab />);

    expect(await screen.findByText('Getting Started Guide')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /download/i }));

    await waitFor(() => expect(createSignedUrl).toHaveBeenCalledWith('abc/guide.pdf', 60));
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('shows an error if the signed URL request fails', async () => {
    order.mockResolvedValueOnce({
      data: [
        {
          id: 'doc-1',
          title: 'Getting Started Guide',
          storage_path: 'abc/guide.pdf',
          file_size: 2048,
          content_type: 'application/pdf',
          uploaded_by: 'admin-1',
          created_at: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const user = userEvent.setup();
    render(<DocumentsTab />);

    await screen.findByText('Getting Started Guide');
    await user.click(screen.getByRole('button', { name: /download/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not download/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest components/portal/DocumentsTab.test.tsx`
Expected: FAIL — `Cannot find module './DocumentsTab'`.

- [ ] **Step 3: Write the component**

`components/portal/DocumentsTab.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Document } from '@/lib/portal/types';
import styles from './DocumentsTab.module.css';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsTab() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      const supabase = createClient();
      const { data } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setDocuments(data ?? []);
        setLoading(false);
      }
    }

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDownload(doc: Document) {
    setDownloadError(null);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('training-documents')
      .createSignedUrl(doc.storage_path, 60);

    if (error || !data) {
      setDownloadError(`Could not download "${doc.title}". Please try again.`);
      return;
    }

    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.download = doc.title;
    link.click();
  }

  if (loading) {
    return <p>Loading documents…</p>;
  }

  if (documents.length === 0) {
    return <p>No documents available yet.</p>;
  }

  return (
    <div className={styles.wrapper}>
      {downloadError && (
        <p role="alert" className={styles.error}>
          {downloadError}
        </p>
      )}
      <ul className={styles.list}>
        {documents.map((doc) => (
          <li key={doc.id} className={styles.row}>
            <span className={styles.title}>{doc.title}</span>
            <span className={styles.meta}>{formatFileSize(doc.file_size)}</span>
            <span className={styles.meta}>{new Date(doc.created_at).toLocaleDateString()}</span>
            <button type="button" onClick={() => handleDownload(doc)}>
              Download
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`components/portal/DocumentsTab.module.css`:
```css
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-alt);
}

.title {
  flex: 1;
  font-weight: 600;
}

.meta {
  color: var(--color-muted);
  font-size: 0.875rem;
  white-space: nowrap;
}

.row button {
  background: var(--color-accent);
  color: #fff;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font: inherit;
}

.row button:hover {
  filter: brightness(0.9);
}

.error {
  color: #d1274b;
  margin-bottom: 0.75rem;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest components/portal/DocumentsTab.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/portal/DocumentsTab.tsx components/portal/DocumentsTab.module.css components/portal/DocumentsTab.test.tsx
git commit -m "Add portal Documents tab"
```

---

## Task 6: Videos tab, player modal, and watched toggle

**Files:**
- Create: `components/portal/VideoPlayerModal.tsx`
- Create: `components/portal/VideoPlayerModal.module.css`
- Create: `components/portal/VideosTab.tsx`
- Create: `components/portal/VideosTab.module.css`
- Create: `components/portal/VideosTab.test.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client` (Task 1), `Video` type from `@/lib/portal/types` (Task 1).
- Produces: `VideosTab` (default export, props `{ userId: string }`) — consumed by `PortalTabs` in Task 9.

- [ ] **Step 1: Write the failing test**

`components/portal/VideosTab.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideosTab from './VideosTab';

const videosOrder = jest.fn();
const watchesEq = jest.fn();
const createSignedUrl = jest.fn();
const insertWatch = jest.fn();
const deleteWatch = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'videos') {
        return { select: () => ({ order: (...args: unknown[]) => videosOrder(...args) }) };
      }
      // video_watches
      return {
        select: () => ({ eq: (...args: unknown[]) => watchesEq(...args) }),
        insert: (...args: unknown[]) => insertWatch(...args),
        delete: () => ({
          eq: () => ({
            eq: (...args: unknown[]) => deleteWatch(...args),
          }),
        }),
      };
    },
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => createSignedUrl(...args),
      }),
    },
  }),
}));

describe('VideosTab', () => {
  beforeEach(() => {
    videosOrder.mockReset();
    watchesEq.mockReset();
    createSignedUrl.mockReset();
    insertWatch.mockReset();
    deleteWatch.mockReset();
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/signed.mp4' }, error: null });
  });

  it('shows an empty state when there are no videos', async () => {
    videosOrder.mockResolvedValueOnce({ data: [] });
    watchesEq.mockResolvedValueOnce({ data: [] });
    render(<VideosTab userId="user-1" />);

    expect(await screen.findByText(/no videos available/i)).toBeInTheDocument();
  });

  it('renders a grid of videos and marks a video as watched', async () => {
    videosOrder.mockResolvedValueOnce({
      data: [
        { id: 'vid-1', title: 'Intro', storage_path: 'v1.mp4', thumbnail_path: null, uploaded_by: 'admin-1', created_at: '2026-08-01T00:00:00.000Z' },
      ],
    });
    watchesEq.mockResolvedValueOnce({ data: [] });
    insertWatch.mockResolvedValueOnce({ error: null });

    const user = userEvent.setup();
    render(<VideosTab userId="user-1" />);

    expect(await screen.findByText('Intro')).toBeInTheDocument();
    expect(screen.queryByText('Watched')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mark as watched/i }));

    await waitFor(() => expect(insertWatch).toHaveBeenCalledWith({ user_id: 'user-1', video_id: 'vid-1' }));
    expect(await screen.findByText('Watched')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark as unwatched/i })).toBeInTheDocument();
  });

  it('opens the player modal when a thumbnail is clicked', async () => {
    videosOrder.mockResolvedValueOnce({
      data: [
        { id: 'vid-1', title: 'Intro', storage_path: 'v1.mp4', thumbnail_path: null, uploaded_by: 'admin-1', created_at: '2026-08-01T00:00:00.000Z' },
      ],
    });
    watchesEq.mockResolvedValueOnce({ data: [] });

    const user = userEvent.setup();
    render(<VideosTab userId="user-1" />);

    await screen.findByText('Intro');
    await user.click(screen.getByRole('button', { name: /play intro/i }));

    expect(await screen.findByRole('dialog', { name: 'Intro' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest components/portal/VideosTab.test.tsx`
Expected: FAIL — `Cannot find module './VideosTab'`.

- [ ] **Step 3: Write the components**

`components/portal/VideoPlayerModal.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Video } from '@/lib/portal/types';
import styles from './VideoPlayerModal.module.css';

interface VideoPlayerModalProps {
  video: Video;
  onClose: () => void;
}

export default function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUrl() {
      const supabase = createClient();
      const { data, error: signError } = await supabase.storage
        .from('training-videos')
        .createSignedUrl(video.storage_path, 3600);

      if (cancelled) return;

      if (signError || !data) {
        setError('Could not load this video. Please try again.');
        return;
      }

      setSignedUrl(data.signedUrl);
    }

    loadUrl();
    return () => {
      cancelled = true;
    };
  }, [video.storage_path]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={video.title}>
      <div className={styles.content}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>{video.title}</h2>
        {error && <p role="alert">{error}</p>}
        {signedUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={signedUrl} controls autoPlay className={styles.video} />
        )}
      </div>
    </div>
  );
}
```

`components/portal/VideoPlayerModal.module.css`:
```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(11, 23, 48, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 100;
}

.content {
  background: var(--color-bg);
  color: var(--color-fg);
  border-radius: 8px;
  padding: 1.5rem;
  width: 100%;
  max-width: 48rem;
  position: relative;
}

.close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--color-fg);
}

.video {
  width: 100%;
  border-radius: 4px;
  margin-top: 0.5rem;
}
```

`components/portal/VideosTab.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Video } from '@/lib/portal/types';
import VideoPlayerModal from './VideoPlayerModal';
import styles from './VideosTab.module.css';

interface VideosTabProps {
  userId: string;
}

export default function VideosTab({ userId }: VideosTabProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const [{ data: videoRows }, { data: watchRows }] = await Promise.all([
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
        supabase.from('video_watches').select('video_id').eq('user_id', userId),
      ]);

      if (cancelled) return;

      const rows = videoRows ?? [];
      setVideos(rows);
      setWatchedIds(new Set((watchRows ?? []).map((w: { video_id: string }) => w.video_id)));

      const urls: Record<string, string> = {};
      await Promise.all(
        rows
          .filter((v: Video) => v.thumbnail_path)
          .map(async (v: Video) => {
            const { data } = await supabase.storage
              .from('training-videos')
              .createSignedUrl(v.thumbnail_path as string, 3600);
            if (data) urls[v.id] = data.signedUrl;
          })
      );

      if (!cancelled) {
        setThumbnailUrls(urls);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function toggleWatched(video: Video) {
    const supabase = createClient();
    const isWatched = watchedIds.has(video.id);

    if (isWatched) {
      await supabase.from('video_watches').delete().eq('user_id', userId).eq('video_id', video.id);
      setWatchedIds((prev) => {
        const next = new Set(prev);
        next.delete(video.id);
        return next;
      });
    } else {
      await supabase.from('video_watches').insert({ user_id: userId, video_id: video.id });
      setWatchedIds((prev) => new Set(prev).add(video.id));
    }
  }

  if (loading) {
    return <p>Loading videos…</p>;
  }

  if (videos.length === 0) {
    return <p>No videos available yet.</p>;
  }

  return (
    <div className={styles.grid}>
      {videos.map((video) => (
        <div key={video.id} className={styles.card}>
          <button
            type="button"
            className={styles.thumbnailButton}
            onClick={() => setPlayingVideo(video)}
            aria-label={`Play ${video.title}`}
          >
            {thumbnailUrls[video.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrls[video.id]} alt="" className={styles.thumbnail} />
            ) : (
              <div className={styles.placeholder}>▶</div>
            )}
          </button>
          <div className={styles.cardFooter}>
            <span className={styles.title}>{video.title}</span>
            {watchedIds.has(video.id) && <span className={styles.badge}>Watched</span>}
          </div>
          <button type="button" className={styles.watchToggle} onClick={() => toggleWatched(video)}>
            {watchedIds.has(video.id) ? 'Mark as unwatched' : 'Mark as watched'}
          </button>
        </div>
      ))}
      {playingVideo && <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
    </div>
  );
}
```

`components/portal/VideosTab.module.css`:
```css
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-bg-alt);
  display: flex;
  flex-direction: column;
}

.thumbnailButton {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  cursor: pointer;
  aspect-ratio: 16 / 9;
  background: var(--color-navy-deep);
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 2rem;
}

.cardFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.25rem;
}

.title {
  font-weight: 600;
}

.badge {
  background: var(--color-accent);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.6rem;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.watchToggle {
  margin: 0.5rem 1rem 1rem;
  background: none;
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  padding: 0.4rem 1rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font: inherit;
  align-self: flex-start;
}

.watchToggle:hover {
  background: var(--color-accent);
  color: #fff;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest components/portal/VideosTab.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/portal/VideoPlayerModal.tsx components/portal/VideoPlayerModal.module.css components/portal/VideosTab.tsx components/portal/VideosTab.module.css components/portal/VideosTab.test.tsx
git commit -m "Add portal Videos tab with player modal and watched toggle"
```

---

## Task 7: Admin user management (API routes + UI)

**Files:**
- Create: `lib/portal/admin-guard.ts`
- Create: `app/api/portal/admin/users/route.ts`
- Create: `app/api/portal/admin/users/[id]/route.ts`
- Create: `components/portal/AdminUsers.tsx`
- Create: `components/portal/AdminUsers.module.css`
- Create: `components/portal/AdminUsers.test.tsx`

**Interfaces:**
- Consumes: `createClient` (server) from `@/lib/supabase/server`, `createAdminClient` from `@/lib/supabase/admin` (Task 1).
- Produces: `GET /api/portal/admin/users` → `{ users: { id, email, role, disabledAt, createdAt }[] }`; `POST /api/portal/admin/users` (body `{ email, password }`) → `201 { user: { id, email } }`; `PATCH /api/portal/admin/users/[id]` (body `{ disabled: boolean }`); `DELETE /api/portal/admin/users/[id]`. `AdminUsers` (default export, no props) — consumed by `AdminTab` in Task 8.

- [ ] **Step 1: Write the admin guard helper**

`lib/portal/admin-guard.ts`:
```ts
import { createClient } from '@/lib/supabase/server';

type AdminGuardResult =
  | { authorized: true; userId: string }
  | { authorized: false; status: number; message: string };

export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, status: 401, message: 'Not signed in.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { authorized: false, status: 403, message: 'Admin access required.' };
  }

  return { authorized: true, userId: user.id };
}
```

- [ ] **Step 2: Write the user-list and create-user route**

`app/api/portal/admin/users/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/portal/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.authorized) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const adminClient = createAdminClient();
  const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, role, disabled_at, created_at');
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users = authUsers.users.map((u) => ({
    id: u.id,
    email: u.email,
    role: profileById.get(u.id)?.role ?? 'user',
    disabledAt: profileById.get(u.id)?.disabled_at ?? null,
    createdAt: u.created_at,
  }));

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.authorized) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { email, password } = await request.json();
  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Email and a password of at least 8 characters are required.' },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? 'Could not create user.' }, { status: 400 });
  }

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } }, { status: 201 });
}
```

- [ ] **Step 3: Write the disable/enable/delete route**

`app/api/portal/admin/users/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/portal/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/portal/admin/users/[id]'>) {
  const guard = await requireAdmin();
  if (!guard.authorized) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await ctx.params;
  const { disabled } = await request.json();
  const adminClient = createAdminClient();

  const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
    ban_duration: disabled ? '876000h' : 'none',
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ disabled_at: disabled ? new Date().toISOString() : null })
    .eq('id', id);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<'/api/portal/admin/users/[id]'>) {
  const guard = await requireAdmin();
  if (!guard.authorized) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await ctx.params;
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
```

`RouteContext<'/api/portal/admin/users/[id]'>` is a globally-available generated type (see `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, "Route Context Helper") — it's generated by `next dev`/`next build`/`next typegen`, so run `npx next typegen` (or `npm run dev` once) before `npx tsc --noEmit` in Step 5 if type-checking fails with "Cannot find name 'RouteContext'".

- [ ] **Step 4: Write the failing test for the UI**

`components/portal/AdminUsers.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsers from './AdminUsers';

const usersResponse = {
  users: [
    { id: 'user-1', email: 'trainee@example.com', role: 'user', disabledAt: null, createdAt: '2026-08-01T00:00:00.000Z' },
  ],
};

describe('AdminUsers', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('lists existing users', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => usersResponse,
    });

    render(<AdminUsers />);

    expect(await screen.findByText('trainee@example.com')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('creates a new user and refreshes the list', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => usersResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: 'user-2', email: 'new@example.com' } }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [
            ...usersResponse.users,
            { id: 'user-2', email: 'new@example.com', role: 'user', disabledAt: null, createdAt: '2026-08-19T00:00:00.000Z' },
          ],
        }),
      });

    const user = userEvent.setup();
    render(<AdminUsers />);
    await screen.findByText('trainee@example.com');

    await user.type(screen.getByLabelText(/^email$/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'a-strong-password');
    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/portal/admin/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'new@example.com', password: 'a-strong-password' }),
        })
      )
    );
    expect(await screen.findByText('new@example.com')).toBeInTheDocument();
  });

  it('disables a user', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => usersResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [{ ...usersResponse.users[0], disabledAt: '2026-08-19T00:00:00.000Z' }],
        }),
      });

    const user = userEvent.setup();
    render(<AdminUsers />);
    await screen.findByText('trainee@example.com');

    await user.click(screen.getByRole('button', { name: /^disable$/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/portal/admin/users/user-1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ disabled: true }) })
      )
    );
    expect(await screen.findByText('Disabled')).toBeInTheDocument();
  });

  it('deletes a user after confirmation', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => usersResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ users: [] }) });

    const user = userEvent.setup();
    render(<AdminUsers />);
    await screen.findByText('trainee@example.com');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/portal/admin/users/user-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    );
    expect(screen.queryByText('trainee@example.com')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx jest components/portal/AdminUsers.test.tsx`
Expected: FAIL — `Cannot find module './AdminUsers'`.

- [ ] **Step 6: Write the component**

`components/portal/AdminUsers.tsx`:
```tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import styles from './AdminUsers.module.css';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  disabledAt: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const response = await fetch('/api/portal/admin/users');
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? 'Could not load users.');
      setLoading(false);
      return;
    }
    setUsers(body.users);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let generated = '';
    for (let i = 0; i < 16; i += 1) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(generated);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    const response = await fetch('/api/portal/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json();
    setCreating(false);
    if (!response.ok) {
      setError(body.error ?? 'Could not create user.');
      return;
    }
    setEmail('');
    setPassword('');
    await loadUsers();
  }

  async function handleToggleDisabled(user: AdminUser) {
    setError(null);
    const response = await fetch(`/api/portal/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: !user.disabledAt }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? 'Could not update user.');
      return;
    }
    await loadUsers();
  }

  async function handleDelete(user: AdminUser) {
    if (!window.confirm(`Permanently delete ${user.email}? This cannot be undone.`)) {
      return;
    }
    setError(null);
    const response = await fetch(`/api/portal/admin/users/${user.id}`, { method: 'DELETE' });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? 'Could not delete user.');
      return;
    }
    await loadUsers();
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleCreate}>
        <h3>Create user</h3>
        <label htmlFor="new-user-email">Email</label>
        <input
          id="new-user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="new-user-password">Password</label>
        <div className={styles.passwordRow}>
          <input
            id="new-user-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <button type="button" onClick={generatePassword}>
            Generate
          </button>
        </div>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create user'}
        </button>
      </form>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading users…</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.disabledAt ? 'Disabled' : 'Active'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button type="button" onClick={() => handleToggleDisabled(user)}>
                    {user.disabledAt ? 'Enable' : 'Disable'}
                  </button>
                  <button type="button" onClick={() => handleDelete(user)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

`components/portal/AdminUsers.module.css`:
```css
.form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 24rem;
  margin-bottom: 1.5rem;
}

.form label {
  font-weight: 600;
}

.form input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font: inherit;
}

.passwordRow {
  display: flex;
  gap: 0.5rem;
}

.passwordRow input {
  flex: 1;
}

.form button[type='submit'] {
  background: var(--color-accent);
  color: #fff;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font: inherit;
  align-self: flex-start;
}

.error {
  color: #d1274b;
  margin-bottom: 1rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.table td button {
  background: none;
  border: 1px solid var(--color-border);
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font: inherit;
  margin-right: 0.5rem;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx jest components/portal/AdminUsers.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 8: Verify the route handlers type-check**

Run: `npx next typegen && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add lib/portal/admin-guard.ts app/api/portal/admin/users components/portal/AdminUsers.tsx components/portal/AdminUsers.module.css components/portal/AdminUsers.test.tsx
git commit -m "Add admin user management API routes and UI"
```

---

## Task 8: Admin content upload

**Files:**
- Create: `components/portal/AdminUpload.tsx`
- Create: `components/portal/AdminUpload.module.css`
- Create: `components/portal/AdminUpload.test.tsx`
- Create: `components/portal/AdminTab.tsx`
- Create: `components/portal/AdminTab.module.css`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client` (Task 1).
- Produces: `AdminUpload` (default export, no props), `AdminTab` (default export, no props, composes `AdminUsers` from Task 7 and `AdminUpload`) — consumed by `PortalTabs` in Task 9.

- [ ] **Step 1: Write the failing test**

`components/portal/AdminUpload.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUpload from './AdminUpload';

const upload = jest.fn();
const insert = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({ upload: (...args: unknown[]) => upload(...args) }),
    },
    from: () => ({ insert: (...args: unknown[]) => insert(...args) }),
  }),
}));

describe('AdminUpload', () => {
  beforeEach(() => {
    upload.mockReset();
    insert.mockReset();
  });

  it('uploads a document and inserts its metadata', async () => {
    upload.mockResolvedValueOnce({ error: null });
    insert.mockResolvedValueOnce({ error: null });

    const user = userEvent.setup();
    render(<AdminUpload />);

    const file = new File(['contents'], 'guide.pdf', { type: 'application/pdf' });
    await user.type(screen.getByLabelText(/^title$/i), 'Getting Started Guide');
    await user.upload(screen.getByLabelText(/^file$/i), file);
    await user.click(screen.getByRole('button', { name: /upload document/i }));

    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Getting Started Guide', content_type: 'application/pdf' })
    );
  });

  it('shows an error when the document upload fails', async () => {
    upload.mockResolvedValueOnce({ error: { message: 'storage error' } });

    const user = userEvent.setup();
    render(<AdminUpload />);

    const file = new File(['contents'], 'guide.pdf', { type: 'application/pdf' });
    await user.type(screen.getByLabelText(/^title$/i), 'Getting Started Guide');
    await user.upload(screen.getByLabelText(/^file$/i), file);
    await user.click(screen.getByRole('button', { name: /upload document/i }));

    expect(await screen.findByText('storage error')).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it('uploads a video without a thumbnail', async () => {
    upload.mockResolvedValueOnce({ error: null });
    insert.mockResolvedValueOnce({ error: null });

    const user = userEvent.setup();
    render(<AdminUpload />);

    const file = new File(['contents'], 'intro.mp4', { type: 'video/mp4' });
    await user.type(screen.getByLabelText(/video title/i), 'Intro');
    await user.upload(screen.getByLabelText(/video file/i), file);
    await user.click(screen.getByRole('button', { name: /upload video/i }));

    await waitFor(() => expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Intro', thumbnail_path: null })
    ));
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest components/portal/AdminUpload.test.tsx`
Expected: FAIL — `Cannot find module './AdminUpload'`.

- [ ] **Step 3: Write the components**

`components/portal/AdminUpload.tsx`:
```tsx
'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './AdminUpload.module.css';

type Status = 'idle' | 'saving' | 'error';

export default function AdminUpload() {
  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docStatus, setDocStatus] = useState<Status>('idle');
  const [docError, setDocError] = useState<string | null>(null);

  const [videoTitle, setVideoTitle] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoStatus, setVideoStatus] = useState<Status>('idle');
  const [videoError, setVideoError] = useState<string | null>(null);

  async function handleDocSubmit(event: FormEvent) {
    event.preventDefault();
    if (!docFile) return;
    setDocStatus('saving');
    setDocError(null);

    const supabase = createClient();
    const path = `${Date.now()}-${docFile.name}`;
    const { error: uploadError } = await supabase.storage.from('training-documents').upload(path, docFile);

    if (uploadError) {
      setDocStatus('error');
      setDocError(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from('documents').insert({
      title: docTitle,
      storage_path: path,
      file_size: docFile.size,
      content_type: docFile.type || 'application/octet-stream',
    });

    if (insertError) {
      setDocStatus('error');
      setDocError(insertError.message);
      return;
    }

    setDocStatus('idle');
    setDocTitle('');
    setDocFile(null);
  }

  async function handleVideoSubmit(event: FormEvent) {
    event.preventDefault();
    if (!videoFile) return;
    setVideoStatus('saving');
    setVideoError(null);

    const supabase = createClient();
    const videoPath = `${Date.now()}-${videoFile.name}`;
    const { error: videoUploadError } = await supabase.storage
      .from('training-videos')
      .upload(videoPath, videoFile);

    if (videoUploadError) {
      setVideoStatus('error');
      setVideoError(videoUploadError.message);
      return;
    }

    let thumbnailPath: string | null = null;
    if (thumbnailFile) {
      thumbnailPath = `${Date.now()}-${thumbnailFile.name}`;
      const { error: thumbnailError } = await supabase.storage
        .from('training-videos')
        .upload(thumbnailPath, thumbnailFile);
      if (thumbnailError) {
        setVideoStatus('error');
        setVideoError(thumbnailError.message);
        return;
      }
    }

    const { error: insertError } = await supabase.from('videos').insert({
      title: videoTitle,
      storage_path: videoPath,
      thumbnail_path: thumbnailPath,
    });

    if (insertError) {
      setVideoStatus('error');
      setVideoError(insertError.message);
      return;
    }

    setVideoStatus('idle');
    setVideoTitle('');
    setVideoFile(null);
    setThumbnailFile(null);
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleDocSubmit}>
        <h3>Upload document</h3>
        <label htmlFor="doc-title">Title</label>
        <input id="doc-title" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} required />
        <label htmlFor="doc-file">File</label>
        <input
          id="doc-file"
          type="file"
          onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
          required
        />
        {docError && (
          <p role="alert" className={styles.error}>
            {docError}
          </p>
        )}
        <button type="submit" disabled={docStatus === 'saving'}>
          {docStatus === 'saving' ? 'Uploading…' : 'Upload document'}
        </button>
      </form>

      <form className={styles.form} onSubmit={handleVideoSubmit}>
        <h3>Upload video</h3>
        <label htmlFor="video-title">Video title</label>
        <input id="video-title" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} required />
        <label htmlFor="video-file">Video file</label>
        <input
          id="video-file"
          type="file"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
          required
        />
        <label htmlFor="video-thumbnail">Thumbnail image (optional)</label>
        <input
          id="video-thumbnail"
          type="file"
          accept="image/*"
          onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
        />
        {videoError && (
          <p role="alert" className={styles.error}>
            {videoError}
          </p>
        )}
        <button type="submit" disabled={videoStatus === 'saving'}>
          {videoStatus === 'saving' ? 'Uploading…' : 'Upload video'}
        </button>
      </form>
    </div>
  );
}
```

`components/portal/AdminUpload.module.css`:
```css
.wrapper {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 24rem;
}

.form label {
  font-weight: 600;
}

.form input[type='text'],
.form input:not([type]) {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font: inherit;
}

.form button[type='submit'] {
  background: var(--color-accent);
  color: #fff;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font: inherit;
  align-self: flex-start;
}

.error {
  color: #d1274b;
}
```

`components/portal/AdminTab.tsx`:
```tsx
import AdminUsers from './AdminUsers';
import AdminUpload from './AdminUpload';
import styles from './AdminTab.module.css';

export default function AdminTab() {
  return (
    <div className={styles.wrapper}>
      <section>
        <h2>Users</h2>
        <AdminUsers />
      </section>
      <section>
        <h2>Content</h2>
        <AdminUpload />
      </section>
    </div>
  );
}
```

`components/portal/AdminTab.module.css`:
```css
.wrapper {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest components/portal/AdminUpload.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/portal/AdminUpload.tsx components/portal/AdminUpload.module.css components/portal/AdminUpload.test.tsx components/portal/AdminTab.tsx components/portal/AdminTab.module.css
git commit -m "Add admin content upload forms and Admin tab"
```

---

## Task 9: Portal tabs shell

**Files:**
- Create: `components/portal/PortalTabs.tsx`
- Create: `components/portal/PortalTabs.module.css`
- Create: `components/portal/PortalTabs.test.tsx`

**Interfaces:**
- Consumes: `DocumentsTab` (Task 5), `VideosTab` (Task 6), `AdminTab` (Task 8).
- Produces: `PortalTabs` (default export, props `{ userId: string; role: 'admin' | 'user' }`) — consumed by `app/portal/page.tsx` in Task 10.

- [ ] **Step 1: Write the failing test**

`components/portal/PortalTabs.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortalTabs from './PortalTabs';

jest.mock('./DocumentsTab', () => ({
  __esModule: true,
  default: () => <div>documents-tab-content</div>,
}));
jest.mock('./VideosTab', () => ({
  __esModule: true,
  default: ({ userId }: { userId: string }) => <div>videos-tab-content for {userId}</div>,
}));
jest.mock('./AdminTab', () => ({
  __esModule: true,
  default: () => <div>admin-tab-content</div>,
}));

describe('PortalTabs', () => {
  it('shows the Documents tab by default and hides Admin for a regular user', () => {
    render(<PortalTabs userId="user-1" role="user" />);

    expect(screen.getByText('documents-tab-content')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('switches to the Videos tab when clicked', async () => {
    const user = userEvent.setup();
    render(<PortalTabs userId="user-1" role="user" />);

    await user.click(screen.getByRole('tab', { name: /videos/i }));

    expect(screen.getByText('videos-tab-content for user-1')).toBeInTheDocument();
  });

  it('shows the Admin tab for an admin and can switch to it', async () => {
    const user = userEvent.setup();
    render(<PortalTabs userId="admin-1" role="admin" />);

    const adminTab = screen.getByRole('tab', { name: /admin/i });
    await user.click(adminTab);

    expect(screen.getByText('admin-tab-content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest components/portal/PortalTabs.test.tsx`
Expected: FAIL — `Cannot find module './PortalTabs'`.

- [ ] **Step 3: Write the component**

`components/portal/PortalTabs.tsx`:
```tsx
'use client';

import { useState } from 'react';
import DocumentsTab from './DocumentsTab';
import VideosTab from './VideosTab';
import AdminTab from './AdminTab';
import styles from './PortalTabs.module.css';

type TabKey = 'documents' | 'videos' | 'admin';

interface PortalTabsProps {
  userId: string;
  role: 'admin' | 'user';
}

export default function PortalTabs({ userId, role }: PortalTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('documents');

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabList} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'documents'}
          onClick={() => setActiveTab('documents')}
        >
          Documents
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'videos'}
          onClick={() => setActiveTab('videos')}
        >
          Videos
        </button>
        {role === 'admin' && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'admin'}
            onClick={() => setActiveTab('admin')}
          >
            Admin
          </button>
        )}
      </div>

      <div className={styles.panel}>
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'videos' && <VideosTab userId={userId} />}
        {activeTab === 'admin' && role === 'admin' && <AdminTab />}
      </div>
    </div>
  );
}
```

`components/portal/PortalTabs.module.css`:
```css
.wrapper {
  max-width: 60rem;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

.tabList {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1.5rem;
}

.tabList button {
  background: none;
  border: none;
  padding: 0.75rem 1.25rem;
  font: inherit;
  font-weight: 600;
  color: var(--color-muted);
  cursor: pointer;
  border-bottom: 3px solid transparent;
}

.tabList button[aria-selected='true'] {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest components/portal/PortalTabs.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/portal/PortalTabs.tsx components/portal/PortalTabs.module.css components/portal/PortalTabs.test.tsx
git commit -m "Add portal tabs shell with role-aware Admin tab"
```

---

## Task 10: Portal page and session-refresh proxy

**Files:**
- Create: `app/portal/page.tsx`
- Create: `proxy.ts`

**Interfaces:**
- Consumes: `createClient` (server) from `@/lib/supabase/server` (Task 1), `LoginForm` (Task 3), `PortalTabs` (Task 9).
- Produces: the live `/portal` route.

- [ ] **Step 1: Write the portal page**

`app/portal/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server';
import LoginForm from '@/components/portal/LoginForm';
import PortalTabs from '@/components/portal/PortalTabs';

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginForm />;
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  return <PortalTabs userId={user.id} role={profile?.role === 'admin' ? 'admin' : 'user'} />;
}
```

This Server Component isn't covered by a Jest unit test — mocking `next/headers`' `cookies()` deeply enough to unit test it adds more test-harness complexity than the two-line component justifies. It's covered by the manual end-to-end pass in Task 12.

- [ ] **Step 2: Write the session-refresh proxy**

This project's Next.js version renames `middleware.ts` to `proxy.ts` with an exported `proxy` function (confirmed in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`) — do not name this file `middleware.ts`.

`proxy.ts` (project root, alongside `package.json`):
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refreshes the auth token cookie if it's expired — required so Server
  // Components reading cookies() see an up-to-date session.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/portal/:path*'],
};
```

- [ ] **Step 3: Verify the build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds, `/portal` and `/portal/reset-password` appear in the route list.

- [ ] **Step 4: Commit**

```bash
git add app/portal/page.tsx proxy.ts
git commit -m "Wire up the /portal page and session-refresh proxy"
```

---

## Task 11: "Login" link in the top nav

**Files:**
- Modify: `components/Header.tsx`
- Modify: `components/Header.test.tsx`

**Interfaces:**
- Consumes: none new.
- Produces: nothing consumed elsewhere — this is the final visible integration point.

- [ ] **Step 1: Write the failing test**

Add to `components/Header.test.tsx` (inside the existing `describe('Header', ...)` block):
```tsx
  it('renders a Login link to the portal', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/portal');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest components/Header.test.tsx`
Expected: FAIL — no link named "Login" found.

- [ ] **Step 3: Add the link**

In `components/Header.tsx`, add the import:
```tsx
import Link from 'next/link';
```

Change the primary `<nav>` block to:
```tsx
<nav className={styles.nav} aria-label="Primary">
  {NAV_LINKS.map((link) => (
    <a key={link.href} href={link.href}>
      {link.label}
    </a>
  ))}
  <Link href="/portal">Login</Link>
</nav>
```

And the mobile `<nav>` block to:
```tsx
{menuOpen && (
  <nav className={styles.mobileNav} aria-label="Mobile">
    {NAV_LINKS.map((link) => (
      <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
        {link.label}
      </a>
    ))}
    <Link href="/portal" onClick={() => setMenuOpen(false)}>
      Login
    </Link>
    <a href="#contact" onClick={() => setMenuOpen(false)}>
      Get Started
    </a>
  </nav>
)}
```

`.nav a` and `.mobileNav a` in `Header.module.css` already style any anchor rendered inside those containers (including the one `next/link`'s `Link` renders), so no CSS changes are needed.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest components/Header.test.tsx`
Expected: PASS (all tests, including the new one).

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx components/Header.test.tsx
git commit -m "Add Login link to the top nav"
```

---

## Task 12: Manual verification and deployment

**Files:** none (verification and deployment only).

- [ ] **Step 1: Run the full test suite and linter**

Run: `npm test`
Expected: all tests pass.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 2: Manual end-to-end pass on the local dev server**

Run `npm run dev` and, with the admin account bootstrapped in Task 2 Step 5:

1. Visit `/portal` signed out — confirm the login form renders and the rest of the site's chrome (Header/Footer) is not duplicated oddly.
2. Sign in as the admin — confirm the Documents, Videos, and Admin tabs all appear.
3. In the Admin tab, create a new non-admin test user with a throwaway password.
4. In a private/incognito window, sign in as that test user — confirm only Documents and Videos tabs appear (no Admin tab).
5. As the admin, upload a document (Admin → Content) and confirm it appears in the Documents tab for the test user, and that Download successfully fetches the file.
6. As the admin, upload a video with a thumbnail and confirm it appears in the 2-column Videos grid for the test user, that clicking the thumbnail opens the modal and plays the video, and that "Mark as watched" toggles the badge and persists across a page refresh.
7. As the admin, click Disable on the test user; confirm the test user's existing session gets signed out and they can no longer sign back in (error message shown).
8. As the admin, click Enable; confirm the test user can sign in again.
9. As the admin, click Delete on the test user (after confirming); confirm they disappear from the list and can no longer sign in.
10. From the marketing homepage, confirm the "Login" link in the header (desktop and mobile menu) navigates to `/portal`.

If anything in this pass fails, fix it and re-run the affected steps before proceeding — do not deploy with a known-broken flow.

- [ ] **Step 3: Add Supabase environment variables to Vercel**

In the Vercel project (`cloud-assist-one-6u8uh21kw-cloud-assist-one.vercel.app`) dashboard → Settings → Environment Variables, add for the Production (and Preview, if used) environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Use the same values written to `.env.local` in Task 1 / Task 2. This is a manual dashboard step — confirm with the site owner before entering the service-role secret into Vercel.

- [ ] **Step 4: Push to GitHub**

Confirm the `origin` remote points at `https://github.com/Cloud-Assist-One/Cloud-Assist-One-AI` (add it if this repo doesn't have it configured yet), then push the branch this plan was implemented on and confirm with the site owner before pushing to `main` or opening a PR, per this project's standing rule to confirm before pushing shared-state changes.

- [ ] **Step 5: Deploy to Vercel and verify production**

Trigger the Vercel deployment (automatic on push, or manually if configured otherwise). Once live, repeat Step 2's end-to-end pass against the production URL to confirm the environment variables were picked up correctly and Supabase Auth/Storage work from the deployed domain.
