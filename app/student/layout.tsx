import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StudentNav from '@/components/StudentNav';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single();

  // Mentors are always redirected to /mentor — student pages are for students only
  if (profile?.role === 'mentor') redirect('/mentor');

  return (
    <>
      <StudentNav name={profile?.name ?? ''} isMentor={false} />
      <main>{children}</main>
    </>
  );
}
