'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ClipboardCheck, Menu, X } from 'lucide-react';

export default function StudentNav({ name, isMentor }: { name: string; isMentor: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/login');
  }

  function navigate(href: string) {
    setMenuOpen(false);
    router.push(href);
  }

  const links = [
    { href: '/student', label: 'Dashboard' },
    { href: '/student/history', label: 'History' },
  ];

  return (
    <>
      <nav className="nav">
        {/* Logo */}
        <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => router.push('/student')}>
          <ClipboardCheck size={22} color="#000" />
          <span>Lahari<span style={{ color: 'var(--ruby)' }}>.</span></span>
          <span style={{
            marginLeft: '0.5rem',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-heading)',
            padding: '3px 6px',
            background: 'var(--sage)',
            color: '#000',
            fontWeight: 900,
            letterSpacing: '0.05em',
            border: '2px solid #000',
          }}>STUDENT</span>
          <span style={{
            marginLeft: '0.75rem',
            fontSize: '0.65rem',
            color: 'var(--cream-dim)',
            fontWeight: 600,
            textTransform: 'none',
            letterSpacing: 0,
            fontFamily: 'var(--font-body)'
          }}>health is also important take rest</span>
        </div>

        {/* Desktop links */}
        <div className="nav-links nav-desktop">
          {links.map(l => (
            <button
              key={l.href}
              id={`nav-student-${l.label.toLowerCase().replace(' ', '-')}`}
              className={`nav-link ${pathname === l.href || pathname.startsWith(l.href + '/') ? 'active' : ''}`}
              onClick={() => router.push(l.href)}
            >
              {l.label}
            </button>
          ))}
          {isMentor && (
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/mentor')}>
              Mentor
            </button>
          )}
          <div style={{ width: '3px', height: '20px', background: '#000' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase' }}>
            {name}
          </span>
          <button id="student-logout" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="nav-drawer">
          <div className="nav-drawer-user">{name}</div>
          {links.map(l => (
            <button
              key={l.href}
              className={`nav-drawer-link ${pathname === l.href || pathname.startsWith(l.href + '/') ? 'active' : ''}`}
              onClick={() => navigate(l.href)}
            >
              {l.label}
            </button>
          ))}
          {isMentor && (
            <button className="nav-drawer-link" onClick={() => navigate('/mentor')}>
              Mentor View
            </button>
          )}
          <div className="nav-drawer-divider" />
          <button className="nav-drawer-link" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      )}
    </>
  );
}
