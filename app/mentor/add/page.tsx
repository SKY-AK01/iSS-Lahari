'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Map, ChevronRight, Trash2 } from 'lucide-react';
import { PastedTestJSON, MindMapJSON } from '@/lib/types';

type Step = 'subject' | 'chapter' | 'type' | 'upload';
type ContentType = 'test' | 'study';

interface SubjectOption { id: string; name: string; chapters: { id: string; name: string }[] }

// ── Shared file upload zone ──────────────────────────────────────────
function FileUploadZone({ fileName, onFile, onError }: {
  fileName: string;
  onFile: (text: string, name: string) => void;
  onError: (msg: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function readFile(file: File) {
    if (!file.name.endsWith('.json')) { onError('Please select a .json file'); return; }
    const reader = new FileReader();
    reader.onload = ev => onFile(ev.target?.result as string, file.name);
    reader.readAsText(file);
  }

  return (
    <div
      style={{
        border: '2px dashed #000',
        padding: '1.75rem',
        textAlign: 'center',
        cursor: 'pointer',
        background: fileName ? 'var(--sage)' : 'var(--bg-3)',
        transition: 'background 150ms',
      }}
      onClick={() => ref.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
    >
      <input ref={ref} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
      {fileName ? (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700 }}>{fileName}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>Click to change</div>
        </>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Click or drag JSON file here</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>question_bank.json, mind-map.json, etc.</div>
        </>
      )}
    </div>
  );
}

// ── Breadcrumb ───────────────────────────────────────────────────────
function Breadcrumb({ subject, chapter, type, step, onBack }: {
  subject: string; chapter: string; type: ContentType | null; step: Step;
  onBack: () => void;
}) {
  const crumbs = [
    { label: subject || 'Subject', active: step === 'subject' },
    ...(subject ? [{ label: chapter || 'Chapter', active: step === 'chapter' }] : []),
    ...(chapter ? [{ label: type === 'test' ? 'Test Paper' : type === 'study' ? 'Study Material' : 'Choose type', active: step === 'type' || step === 'upload' }] : []),
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ flexShrink: 0 }}>← Back</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {i > 0 && <ChevronRight size={14} style={{ opacity: 0.4 }} />}
            <span style={{
              fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: c.active ? 'var(--ruby)' : 'var(--cream-dim)',
              opacity: c.active ? 1 : 0.5,
            }}>
              {c.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function AddContentPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>('subject');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [contentType, setContentType] = useState<ContentType | null>(null);

  // Existing subjects from DB
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Upload state
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [testPreview, setTestPreview] = useState<PastedTestJSON | null>(null);
  const [studyPreview, setStudyPreview] = useState<MindMapJSON | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/subjects')
      .then(r => r.json())
      .then(d => setSubjectOptions(Array.isArray(d) ? d : []))
      .finally(() => setLoadingSubjects(false));
  }, []);

  const chaptersForSubject = subjectOptions.find(s => s.name === subject)?.chapters ?? [];

  function handleBack() {
    if (step === 'upload') { setStep('type'); setTestPreview(null); setStudyPreview(null); setParseError(''); setJsonText(''); setFileName(''); }
    else if (step === 'type') { setStep('chapter'); setContentType(null); }
    else if (step === 'chapter') { setStep('subject'); setChapter(''); }
    else router.push('/mentor');
  }

  function resetUpload() { setTestPreview(null); setStudyPreview(null); setParseError(''); setSaveError(''); setSaved(false); }

  // ── Validate & preview ───────────────────────────────────────────
  function validateTest(text: string) {
    resetUpload();
    try {
      const parsed = JSON.parse(text) as PastedTestJSON;
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error('No questions found');
      for (const [i, q] of parsed.questions.entries()) {
        if (!q.question) throw new Error(`Q${i + 1}: missing "question"`);
        if (!q.answer) throw new Error(`Q${i + 1}: missing "answer"`);
        if (!['mcq', 'short'].includes(q.type)) throw new Error(`Q${i + 1}: type must be "mcq" or "short"`);
        if (!['easy', 'medium', 'hard'].includes(q.difficulty)) throw new Error(`Q${i + 1}: invalid difficulty`);
        if (q.type === 'mcq' && (!Array.isArray(q.options) || q.options.length < 2)) throw new Error(`Q${i + 1}: MCQ needs 2+ options`);
      }
      // Override subject/chapter from form, not from file
      setTestPreview({ ...parsed, subject, chapter, batch: parsed.batch ?? 1 });
    } catch (e) { setParseError(e instanceof Error ? e.message : 'Invalid JSON'); }
  }

  function validateStudy(text: string) {
    resetUpload();
    try {
      const parsed = JSON.parse(text) as MindMapJSON;
      if (!parsed.title) throw new Error('Missing "title" field');
      if (!Array.isArray(parsed.columns) || !parsed.columns.length) throw new Error('Missing "columns"');
      if (!Array.isArray(parsed.records) || !parsed.records.length) throw new Error('Empty "records"');
      setStudyPreview(parsed);
    } catch (e) { setParseError(e instanceof Error ? e.message : 'Invalid JSON'); }
  }

  function handleValidate() {
    if (!jsonText.trim()) return;
    if (contentType === 'test') validateTest(jsonText);
    else validateStudy(jsonText);
  }

  // ── Save ─────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      if (contentType === 'test' && testPreview) {
        const res = await fetch('/api/tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPreview),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to save');
      } else if (contentType === 'study' && studyPreview) {
        const res = await fetch('/api/study-material', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, chapter, material: studyPreview }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => router.push('/mentor'), 1500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete Chapter ───────────────────────────────────────────────
  async function handleDeleteChapter(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the chapter "${name}" and all its contents?`)) return;
    try {
      const res = await fetch(`/api/delete?type=chapter&id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete chapter');
      
      // Refresh data
      const fetchRes = await fetch('/api/subjects');
      const data = await fetchRes.json();
      setSubjectOptions(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '720px' }}>

      <Breadcrumb subject={subject} chapter={chapter} type={contentType} step={step} onBack={handleBack} />

      {/* ── Step 1: Subject ── */}
      {step === 'subject' && (
        <div className="animate-up">
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 3rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', marginBottom: '1.5rem', lineHeight: 1 }}>
            Choose Subject
          </div>

          {/* Existing subjects */}
          {!loadingSubjects && subjectOptions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
              {subjectOptions.map(s => (
                <button
                  key={s.id}
                  className="btn btn-ghost w-full"
                  style={{ justifyContent: 'space-between', textAlign: 'left', fontWeight: 700, fontSize: '0.95rem' }}
                  onClick={() => { setSubject(s.name); setStep('chapter'); }}
                >
                  <span>{s.name}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.4, fontFamily: 'var(--font-mono)' }}>
                    {s.chapters.length} chapter{s.chapters.length !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {loadingSubjects && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', opacity: 0.5, marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Loading…
            </div>
          )}

          {/* New subject */}
          <div style={{ borderTop: '2px solid #000', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem', opacity: 0.5 }}>
              Or add a new subject
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="input"
                placeholder="e.g. Indian Polity"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && subject.trim() && setStep('chapter')}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                disabled={!subject.trim()}
                onClick={() => setStep('chapter')}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Chapter ── */}
      {step === 'chapter' && (
        <div className="animate-up">
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ruby)', marginBottom: '0.4rem' }}>
            {subject}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 3rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', marginBottom: '1.5rem', lineHeight: 1 }}>
            Choose Chapter
          </div>

          {chaptersForSubject.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
              {chaptersForSubject.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', fontWeight: 700 }}
                    onClick={() => { setChapter(c.name); setStep('type'); }}
                  >
                    {c.name}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '0 0.75rem', color: 'var(--ruby)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChapter(c.id, c.name);
                    }}
                    title="Delete Chapter"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '2px solid #000', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem', opacity: 0.5 }}>
              {chaptersForSubject.length > 0 ? 'Or add a new chapter' : 'Enter chapter name'}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="input"
                placeholder="e.g. Historical Background of the Indian Constitution"
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && chapter.trim() && setStep('type')}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                disabled={!chapter.trim()}
                onClick={() => setStep('type')}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Type chooser ── */}
      {step === 'type' && (
        <div className="animate-up">
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ruby)', marginBottom: '0.4rem' }}>
            {subject} › {chapter}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 3rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', marginBottom: '1.5rem', lineHeight: 1 }}>
            What to Add?
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button
              className="card"
              style={{ cursor: 'pointer', padding: '1.75rem', textAlign: 'left', border: 'var(--border-thick)', background: 'var(--bg-3)' }}
              onClick={() => { setContentType('test'); setStep('upload'); }}
            >
              <div style={{ marginBottom: '0.75rem' }}><FileText size={32} strokeWidth={2} /></div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Test Paper</div>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.5, textTransform: 'none', fontWeight: 400 }}>
                Upload a question_bank.json. Students can take it in Practice or Exam mode.
              </p>
            </button>

            <button
              className="card"
              style={{ cursor: 'pointer', padding: '1.75rem', textAlign: 'left', border: '3px solid var(--ruby)', background: 'var(--ruby-subtle)' }}
              onClick={() => { setContentType('study'); setStep('upload'); }}
            >
              <div style={{ marginBottom: '0.75rem', color: 'var(--ruby)' }}><Map size={32} strokeWidth={2} /></div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--ruby)' }}>Study Material</div>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.5, textTransform: 'none', fontWeight: 400 }}>
                Upload a mind-map.json or timeline. Students browse it inline.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Upload ── */}
      {step === 'upload' && (
        <div className="animate-up">
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ruby)', marginBottom: '0.4rem' }}>
            {subject} › {chapter}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 3rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', marginBottom: '1.5rem', lineHeight: 1 }}>
            {contentType === 'test' ? 'Upload Test' : 'Upload Material'}
          </div>

          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <FileUploadZone
              fileName={fileName}
              onFile={(text, name) => { setJsonText(text); setFileName(name); resetUpload(); }}
              onError={msg => setParseError(msg)}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
              <div style={{ flex: 1, height: 2, background: '#000' }} />
              <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.4 }}>or paste</span>
              <div style={{ flex: 1, height: 2, background: '#000' }} />
            </div>

            <textarea
              className="input"
              style={{ minHeight: '180px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
              placeholder={contentType === 'test'
                ? '{ "batch": 1, "questions": [...] }'
                : '{ "title": "mind-map", "columns": [...], "records": [...] }'}
              value={jsonText}
              onChange={e => { setJsonText(e.target.value); resetUpload(); }}
            />

            <button
              className="btn btn-ghost w-full"
              style={{ justifyContent: 'center', marginTop: '0.75rem' }}
              disabled={!jsonText.trim()}
              onClick={handleValidate}
            >
              Validate & Preview
            </button>

            {parseError && (
              <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
                <span style={{ fontWeight: 900 }}>Error:</span> {parseError}
              </div>
            )}
          </div>

          {/* Test preview */}
          {testPreview && (
            <div className="animate-in card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#000', marginBottom: '1rem' }}>
                Preview
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                {[
                  { label: 'Subject', value: subject },
                  { label: 'Chapter', value: chapter },
                  { label: 'Batch', value: `#${testPreview.batch}` },
                  { label: 'Questions', value: testPreview.questions.length },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg)', border: 'var(--border-thick)', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', opacity: 0.4, marginBottom: '0.2rem' }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem' }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {Object.entries(
                  testPreview.questions.reduce((acc: Record<string, number>, q) => { acc[q.difficulty] = (acc[q.difficulty] || 0) + 1; return acc; }, {})
                ).map(([d, n]) => (
                  <span key={d} className={`pill pill-${d}`}>{d}: {n}</span>
                ))}
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {testPreview.questions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', padding: '0.55rem 0.75rem', background: 'var(--bg)', border: 'var(--border-thin)', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', opacity: 0.4, minWidth: '1.8rem' }}>Q{i + 1}</span>
                    <span className={`pill pill-${q.difficulty}`} style={{ flexShrink: 0, fontSize: '0.62rem' }}>{q.difficulty}</span>
                    <span style={{ fontSize: '0.82rem', lineHeight: 1.4, textTransform: 'none', fontWeight: 400 }}>{q.question.slice(0, 100)}{q.question.length > 100 ? '…' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Study preview */}
          {studyPreview && (
            <div className="animate-in card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                Preview — {studyPreview.title}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                {[
                  { label: 'Columns', value: studyPreview.columns.length },
                  { label: 'Rows', value: studyPreview.records.length },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg)', border: 'var(--border-thick)', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', opacity: 0.4, marginBottom: '0.2rem' }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: 'auto', border: 'var(--border-thick)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#000', color: '#FFF' }}>
                      {studyPreview.columns.map(c => (
                        <th key={c} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-heading)', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studyPreview.records.slice(0, 4).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #000', background: i % 2 === 0 ? '#FFF' : '#F4F4F0' }}>
                        {studyPreview.columns.map(c => (
                          <td key={c} style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top', maxWidth: '200px', fontFamily: 'var(--font-body)', fontSize: '0.78rem' }}>
                            <span dangerouslySetInnerHTML={{ __html: (row[c] ?? '—').replace(/<br\s*\/?>/gi, ' ') }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {studyPreview.records.length > 4 && (
                  <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', opacity: 0.5, borderTop: '1px solid #000', fontFamily: 'var(--font-mono)' }}>
                    + {studyPreview.records.length - 4} more rows
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save */}
          {(testPreview || studyPreview) && (
            <div>
              {saveError && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}><span style={{ fontWeight: 900 }}>Error:</span> {saveError}</div>}
              {saved ? (
                <div className="alert alert-success">Saved! Redirecting to dashboard…</div>
              ) : (
                <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving} style={{ justifyContent: 'center' }}>
                  {saving
                    ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</>
                    : contentType === 'test'
                      ? `Save Test — ${testPreview?.questions.length} Questions`
                      : `Save Study Material — ${studyPreview?.records.length} Rows`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
