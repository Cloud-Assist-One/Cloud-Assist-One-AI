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
