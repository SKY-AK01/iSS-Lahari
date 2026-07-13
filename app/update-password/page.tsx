'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, AlertTriangle } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    
    if (newPassword === 'Lahari@2026') {
      setError('Please choose a new secure password.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Success! Redirect to home
    router.push('/');
    router.refresh();
  }

  return (
    <div className="auth-split-grid" style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--bg)',
    }}>
      {/* Left panel */}
      <div style={{
        borderRight: '3px solid #000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem',
        background: 'var(--clay)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ClipboardCheck size={32} strokeWidth={2.5} color="#000" />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#000' }}>
            Lahari<span style={{ color: 'var(--ruby)' }}>.</span>
          </span>
        </div>
        <div>
          <h1 style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', lineHeight: 0.95, color: '#000', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
            MIGRATION<br/>COMPLETE.
          </h1>
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000', opacity: 0.7 }}>
            Please set a new password
          </p>
        </div>
        <div style={{ borderTop: '3px solid #000', paddingTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#000', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          SECURE YOUR ACCOUNT.
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>UPDATE PASSWORD</h2>
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem', color: 'var(--cream-dim)' }}>
              Choose a strong, unique password
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
              <AlertTriangle size={18} /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              style={{ justifyContent: 'center', marginTop: '0.5rem', padding: '1.25rem' }}
            >
              {loading ? <>Updating…</> : 'Update & Continue →'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-split-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
