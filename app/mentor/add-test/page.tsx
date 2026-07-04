'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PastedTestJSON } from '@/lib/types';

export default function AddTestPage() {
  const [jsonText, setJsonText] = useState('');
  const [preview, setPreview] = useState<PastedTestJSON | null>(null);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function handleParse() {
    setParseError('');
    setPreview(null);
    setSaved(false);
    setSaveError('');

    try {
      const parsed = JSON.parse(jsonText) as PastedTestJSON;

      // Validate required fields
      if (!parsed.chapter || typeof parsed.chapter !== 'string')
        throw new Error('Missing or invalid "chapter" field');
      if (!parsed.subject || typeof parsed.subject !== 'string')
        throw new Error('Missing or invalid "subject" field');
      if (typeof parsed.batch !== 'number')
        throw new Error('Missing or invalid "batch" field (should be a number)');
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0)
        throw new Error('No questions found in "questions" array');

      for (const [i, q] of parsed.questions.entries()) {
        if (!q.question) throw new Error(`Question ${i + 1}: missing "question" field`);
        if (!q.answer) throw new Error(`Question ${i + 1}: missing "answer" field`);
        if (!['mcq', 'short'].includes(q.type)) throw new Error(`Question ${i + 1}: invalid type "${q.type}" — must be "mcq" or "short"`);
        if (!['easy', 'medium', 'hard'].includes(q.difficulty)) throw new Error(`Question ${i + 1}: invalid difficulty "${q.difficulty}"`);
        if (q.type === 'mcq' && (!Array.isArray(q.options) || q.options.length < 2))
          throw new Error(`Question ${i + 1}: MCQ must have an "options" array with at least 2 choices`);
      }

      setPreview(parsed);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    setSaveError('');

    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save test');

      setSaved(true);
      setJsonText('');
      setPreview(null);
      setTimeout(() => router.push('/mentor'), 1500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const diffMix = preview?.questions.reduce((acc: Record<string, number>, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});

  const typeMix = preview?.questions.reduce((acc: Record<string, number>, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '780px' }}>
      <div className="animate-up">
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/mentor')} style={{ marginBottom: '1.25rem' }}>
          ← Back
        </button>
        <h1 style={{ marginBottom: '0.4rem' }}>Add Test Batch</h1>
        <p style={{ marginBottom: '2rem' }}>Paste the JSON output from Prompt 3, validate, then save.</p>
      </div>

      <div className="animate-up card" style={{ padding: '1.75rem' }}>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" htmlFor="json-paste">Paste JSON from Prompt 3</label>
          <textarea
            id="json-paste"
            className="input"
            style={{ minHeight: '280px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
            placeholder={'{\n  "chapter": "Historical Background of the Indian Constitution",\n  "subject": "Polity",\n  "batch": 1,\n  "questions": [...]\n}'}
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); setPreview(null); setSaved(false); setParseError(''); setSaveError(''); }}
          />
        </div>

        <button id="validate-json" className="btn btn-ghost w-full" onClick={handleParse} disabled={!jsonText.trim()} style={{ justifyContent: 'center' }}>
          Validate & Preview
        </button>

        {parseError && (
          <div className="alert alert-error" style={{ marginTop: '1rem' }}>
            <span>✗</span> {parseError}
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="animate-up card" style={{ marginTop: '1.5rem', padding: '1.75rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--ruby)' }}>✓ Preview</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Subject', value: preview.subject },
              { label: 'Chapter', value: preview.chapter },
              { label: 'Batch', value: `#${preview.batch}` },
              { label: 'Questions', value: preview.questions.length },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-3)', borderRadius: 'var(--radius)', padding: '0.9rem 1rem' }}>
                <div className="form-label" style={{ marginBottom: '0.3rem', opacity: 0.6 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--cream)' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Difficulty mix */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {diffMix && Object.entries(diffMix).map(([diff, count]) => (
              <span key={diff} className={`pill pill-${diff}`}>
                {diff}: {count}
              </span>
            ))}
            {typeMix && Object.entries(typeMix).map(([type, count]) => (
              <span key={type} style={{
                fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 600,
                padding: '2px 10px', borderRadius: '999px',
                background: 'var(--ruby-subtle)', color: 'var(--ruby)',
                border: '1px solid var(--ruby-glow)',
              }}>
                {type.toUpperCase()}: {count}
              </span>
            ))}
          </div>

          {/* Question list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {preview.questions.map((q, i) => (
              <div key={q.id || i} style={{ display: 'flex', gap: '0.75rem', padding: '0.7rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cream-dim)', opacity: 0.5, minWidth: '2rem' }}>Q{i + 1}</span>
                <span className={`pill pill-${q.difficulty}`} style={{ flexShrink: 0 }}>{q.difficulty}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--cream)', lineHeight: 1.4 }}>{q.question}</span>
              </div>
            ))}
          </div>

          {saveError && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <span>✗</span> {saveError}
            </div>
          )}

          {saved ? (
            <div className="alert alert-success">
              <span>✓</span> Saved! Redirecting to dashboard…
            </div>
          ) : (
            <button id="save-test" className="btn btn-primary w-full" onClick={handleSave} disabled={saving} style={{ justifyContent: 'center' }}>
              {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</> : `Save Batch — ${preview.questions.length} Questions`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
