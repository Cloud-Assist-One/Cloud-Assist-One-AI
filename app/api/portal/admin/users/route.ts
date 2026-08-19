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
