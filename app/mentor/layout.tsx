import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MentorNav from '@/components/MentorNav';

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'mentor') redirect('/student');

  return (
    <>
      <MentorNav name={profile.name} />
      <main>{children}</main>
    </>
  );
}
