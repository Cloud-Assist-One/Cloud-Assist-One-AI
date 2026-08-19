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
