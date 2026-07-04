'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ClipboardCheck } from 'lucide-react';

export default function StudentNav({ name, isMentor }: { name: string; isMentor: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const links = [
    { href: '/student', label: 'Tests' },
    { href: '/student/study', label: 'Study' },
    { href: '/student/history', label: 'My History' },
  ];

  return (
    <nav className="nav">
      <div className="nav-logo">
        <ClipboardCheck size={24} color="#000" />
        <span>Lahari<span style={{ color: 'var(--ruby)' }}>.</span></span>
        <span style={{
          marginLeft: '0.75rem',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-heading)',
          padding: '3px 8px',
          background: 'var(--sage)',
          color: '#000',
          fontWeight: 900,
          letterSpacing: '0.05em',
          border: '2px solid #000',
        }}>STUDENT</span>
      </div>

      <div className="nav-links">
        {links.map(l => (
          <button
            key={l.href}
            id={`nav-student-${l.label.toLowerCase().replace(' ', '-')}`}
            className={`nav-link ${pathname === l.href ? 'active' : ''}`}
            onClick={() => router.push(l.href)}
          >
            {l.label}
          </button>
        ))}
        {isMentor && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push('/mentor')}
            style={{ marginLeft: '0.25rem' }}
          >
            → Mentor view
          </button>
        )}
        <div style={{ width: '3px', height: '20px', background: '#000', margin: '0 0.25rem' }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--cream-dim)', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', padding: '0 0.5rem' }}>
          {name}
        </span>
        <button id="student-logout" className="btn btn-ghost btn-sm" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
