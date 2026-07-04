'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MindMapJSON } from '@/lib/types';

export default function AddStudyMaterialPage() {
  const [chapter, setChapter] = useState('');
  const [subject, setSubject] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [preview, setPreview] = useState<MindMapJSON | null>(null);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function resetState() {
    setPreview(null);
    setSaved(false);
    setParseError('');
    setSaveError('');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) { setParseError('Please upload a .json file'); return; }
    setFileName(file.name);
    resetState();
    const reader = new FileReader();
    reader.onload = (ev) => setJsonText(ev.target?.result as string);
    reader.readAsText(file);
  }

  function handleParse() {
    resetState();
    if (!chapter.trim()) { setParseError('Please enter the chapter name'); return; }
    if (!subject.trim()) { setParseError('Please enter the subject name'); return; }
    try {
      const parsed = JSON.parse(jsonText) as MindMapJSON;
      if (!parsed.title || typeof parsed.title !== 'string')
        throw new Error('Missing "title" field');
      if (!Array.isArray(parsed.columns) || parsed.columns.length === 0)
        throw new Error('Missing "columns" array');
      if (!Array.isArray(parsed.records) || parsed.records.length === 0)
        throw new Error('Missing or empty "records" array');
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
      const res = await fetch('/api/study-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter, subject, material: preview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSaved(true);
      setTimeout(() => router.push('/mentor'), 1500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '880px' }}>
      <div className="animate-up">
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/mentor')} style={{ marginBottom: '1.25rem' }}>
          ← Back
        </button>
        <h1 style={{ marginBottom: '0.4rem' }}>Add Study Material</h1>
        <p style={{ marginBottom: '2rem' }}>Upload a mind-map or timeline JSON file and attach it to a chapter.</p>
      </div>

      <div className="animate-up card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        {/* Chapter + Subject fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="subject-input">Subject</label>
            <input
              id="subject-input"
              className="input"
              placeholder="e.g. Indian Polity"
              value={subject}
              onChange={e => { setSubject(e.target.value); resetState(); }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="chapter-input">Chapter</label>
            <input
              id="chapter-input"
              className="input"
              placeholder="e.g. Historical Background of the Indian Constitution"
              value={chapter}
              onChange={e => { setChapter(e.target.value); resetState(); }}
            />
          </div>
        </div>

        {/* File upload zone */}
        <div
          style={{
            border: '2px dashed var(--ruby-glow, #FF3B0060)',
            borderRadius: 0,
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1.25rem',
            background: fileName ? 'var(--ruby-subtle)' : 'transparent',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (!file) return;
            if (!file.name.endsWith('.json')) { setParseError('Please drop a .json file'); return; }
            setFileName(file.name);
            resetState();
            const reader = new FileReader();
            reader.onload = (ev) => setJsonText(ev.target?.result as string);
            reader.readAsText(file);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          {fileName ? (
            <div>
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              <p style={{ margin: '0.4rem 0 0', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--ruby)' }}>{fileName}</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--cream-dim)', opacity: 0.6 }}>Click to change file</p>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: '2rem' }}>⬆️</span>
              <p style={{ margin: '0.5rem 0 0.25rem', fontWeight: 600, color: 'var(--cream)' }}>Click or drag & drop JSON file</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--cream-dim)', opacity: 0.6 }}>mind-map.json, timeline.json, etc.</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0 1.25rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border, #000)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', opacity: 0.5, fontFamily: 'var(--font-heading)' }}>OR PASTE JSON BELOW</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border, #000)' }} />
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" htmlFor="json-paste">JSON Content</label>
          <textarea
            id="json-paste"
            className="input"
            style={{ minHeight: '200px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
            placeholder='{ "title": "mind-map", "columns": [...], "records": [...] }'
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); resetState(); }}
          />
        </div>

        <button
          className="btn btn-ghost w-full"
          onClick={handleParse}
          disabled={!jsonText.trim() || !chapter.trim() || !subject.trim()}
          style={{ justifyContent: 'center' }}
        >
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
        <div className="animate-up card" style={{ padding: '1.75rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--ruby)' }}>✓ Preview — {preview.title}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Subject', value: subject },
              { label: 'Chapter', value: chapter },
              { label: 'Columns', value: preview.columns.length },
              { label: 'Rows', value: preview.records.length },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-3)', border: 'var(--border-thick)', padding: '0.9rem 1rem' }}>
                <div className="form-label" style={{ marginBottom: '0.3rem', opacity: 0.6 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.95rem' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Mini table preview — first 5 rows */}
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem', border: 'var(--border-thick)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
              <thead>
                <tr style={{ background: '#000', color: '#FFF' }}>
                  {preview.columns.map(col => (
                    <th key={col} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-heading)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.records.slice(0, 5).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #000', background: i % 2 === 0 ? '#FFF' : '#F4F4F0' }}>
                    {preview.columns.map(col => (
                      <td key={col} style={{ padding: '0.6rem 0.75rem', verticalAlign: 'top', maxWidth: '220px' }}>
                        <span dangerouslySetInnerHTML={{ __html: (row[col] ?? '—').replace(/<br\s*\/?>/gi, ' ') }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.records.length > 5 && (
              <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: 'var(--cream-dim)', opacity: 0.6, borderTop: '1px solid #000' }}>
                + {preview.records.length - 5} more rows…
              </div>
            )}
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
            <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving} style={{ justifyContent: 'center' }}>
              {saving
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</>
                : `Save Study Material — ${preview.records.length} Rows`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
