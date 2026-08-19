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
