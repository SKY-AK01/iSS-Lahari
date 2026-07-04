'use client';

import { useState } from 'react';
import { FlaskConical, PenTool, RefreshCw, BookOpen, BookText, FileText, BarChart3, ClipboardList, Library, Search, ChevronRight } from 'lucide-react';

const PROMPT_1 = `You are a deep research assistant for competitive exam preparation.
I want you to build a comprehensive knowledge base for the following chapter:
[CHAPTER NAME] from [SUBJECT] (for IIS / SSC CGL exam).

Cover all of the following:
1. Core concepts, definitions, and constitutional/legal provisions
2. Historical background and evolution
3. Key acts, articles, committees, and personalities
4. Timelines and important dates
5. Previous year questions (PYQ) trends for this chapter
6. Standard sources: NCERT, Laxmikanth, standard polity/history/geography books

Do NOT generate questions yet. Just build the knowledge base thoroughly.`;

const PROMPT_2 = `Using the knowledge base you just built, generate exactly 15 unique exam-style questions:
- 5 Easy, 5 Medium, 5 Hard

For each question provide ALL of the following fields:
Question | Answer | Detailed Explanation | Important Keywords | Relevant Acts/Articles/Dates/Committees/Personalities | Memory Trick | Common Exam Trap | Source(s)

Mix MCQ (with 4 options) and short-answer questions.
Each batch should be fresh — do not repeat questions from previous batches.

Output as plain readable text (not JSON).`;

const PROMPT_3 = `You are a data formatter. I will paste exam questions to you one by one (or all together).
Each question includes: Question, Answer, Detailed Explanation, Important Keywords,
Relevant Acts/Articles/Dates/Committees/Personalities, Memory Trick, Common Exam Trap,
and Source(s). Some questions are MCQ (with options), some are short-answer (no options).

Wait until I say "That's all, generate the JSON now" before producing output.

When I say that, also tell me:
- Chapter name
- Subject (Polity / History / Geography / Economy / etc.)
- Batch number

Then convert everything into this exact JSON structure and output ONLY the JSON:

{
  "chapter": "<chapter name>",
  "subject": "<subject>",
  "batch": <batch number>,
  "questions": [
    {
      "id": "q1",
      "difficulty": "easy" | "medium" | "hard",
      "type": "mcq" | "short",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": "...",
      "explanation": "...",
      "keywords": ["...", "..."],
      "related": ["...", "..."],
      "memory_trick": "...",
      "exam_trap": "...",
      "sources": ["...", "..."]
    }
  ]
}`;

const INITIAL_PROMPTS = [
  { num: 1, title: 'Research Prompt', subtitle: 'Run in NotebookLM to build knowledge base', content: PROMPT_1, icon: <FlaskConical size={18} /> },
  { num: 2, title: 'Question Generation', subtitle: 'Run against the knowledge base — re-run for fresh batches', content: PROMPT_2, icon: <PenTool size={18} /> },
  { num: 3, title: 'JSON Converter', subtitle: 'Paste into a fresh AI chat, then paste Prompt 2 output', content: PROMPT_3, icon: <RefreshCw size={18} /> },
];

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subjects: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentAttempts: any[];
}

export default function MentorDashboardClient({ subjects, recentAttempts }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [prompts, setPrompts] = useState(INITIAL_PROMPTS);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function copyPrompt(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function toggleSubject(id: string) {
    setOpenSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.chapters?.some((c: { name: string }) => c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalBatches = subjects.reduce((n: number, s: { chapters: { test_batches: unknown[] }[] }) =>
    n + s.chapters.reduce((m: number, c: { test_batches: unknown[] }) => m + c.test_batches.length, 0), 0);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* Header */}
      <div className="animate-up" style={{ marginBottom: '2.5rem' }}>
        <h1>Mentor Dashboard</h1>
        <p style={{ marginTop: '0.4rem' }}>
          {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · {totalBatches} test batch{totalBatches !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* Stats row */}
      <div className="animate-up stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Subjects', value: subjects.length, icon: <BookOpen size={24} /> },
          { label: 'Chapters', value: subjects.reduce((n: number, s: { chapters: unknown[] }) => n + s.chapters.length, 0), icon: <BookText size={24} /> },
          { label: 'Test Batches', value: totalBatches, icon: <FileText size={24} /> },
          { label: 'Recent Attempts', value: recentAttempts.length, icon: <BarChart3 size={24} /> },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.4rem', color: 'var(--ink)' }}>{stat.icon}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--ruby)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cream-dim)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Prompts Section */}
      <div className="animate-up" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={20} /> Question Pipeline Prompts
          </h2>
          <a href="/mentor/add-test" className="btn btn-primary btn-sm">+ Add Test</a>
        </div>

        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {prompts.map((p, i) => (
            <div key={p.num} className="card animate-up" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', color: 'var(--ink)' }}>{p.icon}</span>
                    <h3 style={{ fontSize: '1.1rem' }}>Prompt {p.num}: {p.title}</h3>
                    <span className="batch-badge">Step {p.num}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', opacity: 0.8, fontWeight: 700 }}>{p.subtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingIdx === i ? (
                    <button className="btn btn-primary btn-sm" onClick={() => setEditingIdx(null)}>Save</button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingIdx(i)}>Edit</button>
                  )}
                  <button
                    id={`copy-prompt-${p.num}`}
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyPrompt(p.content, i)}
                  >
                    {copiedIdx === i ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              {editingIdx === i ? (
                <textarea
                  className="input prompt-box"
                  style={{ width: '100%', minHeight: '320px', resize: 'vertical' }}
                  value={p.content}
                  onChange={e => {
                    const newPrompts = [...prompts];
                    newPrompts[i].content = e.target.value;
                    setPrompts(newPrompts);
                  }}
                />
              ) : (
                <div className="prompt-box">{p.content}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Test Library */}
      <div className="animate-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Library size={20} /> Test Library
          </h2>
          <div className="search-box" style={{ minWidth: '200px' }}>
            <span className="search-icon"><Search size={16} /></span>
            <input
              id="test-search"
              className="input"
              placeholder="Search subjects or chapters…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', fontSize: '0.88rem', padding: '0.55rem 1rem 0.55rem 2.5rem' }}
            />
          </div>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
            {search ? 'No results found.' : 'No tests added yet. Add your first test above!'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredSubjects.map((subject: { id: string; name: string; chapters: { id: string; name: string; test_batches: { id: string; batch_number: number; question_count: number; difficulty_mix: Record<string, number> | null; created_at: string }[] }[] }) => {
              const isOpen = openSubjects.has(subject.id);
              const totalQ = subject.chapters.reduce((n: number, c) => n + c.test_batches.reduce((m: number, b) => m + (b.question_count || 0), 0), 0);

              return (
                <div key={subject.id}>
                  <div
                    className={`collapsible-header ${isOpen ? 'open' : ''}`}
                    onClick={() => toggleSubject(subject.id)}
                    id={`subject-${subject.id}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--cream)' }}>
                        {subject.name}
                      </span>
                      <span className="batch-badge">{subject.chapters.length} chapter{subject.chapters.length !== 1 ? 's' : ''}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', opacity: 0.5 }}>{totalQ} questions</span>
                    </div>
                    <span className={`chevron ${isOpen ? 'open' : ''}`} style={{ display: 'flex' }}><ChevronRight size={18} /></span>
                  </div>

                  {isOpen && (
                    <div className="collapsible-body" style={{
                      background: '#FFF',
                      borderTop: 'none',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}>
                      {subject.chapters.map((chapter) => (
                        <div key={chapter.id}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', color: '#000', marginBottom: '0.5rem', paddingLeft: '0.5rem', borderLeft: '4px solid #000' }}>
                            {chapter.name}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {chapter.test_batches.map((batch) => {
                              const mix = batch.difficulty_mix as Record<string, number> | null;
                                return (
                                <div key={batch.id} className="admit-card" style={{ flexBasis: '220px', flexGrow: 1, cursor: 'default' }}>
                                  <div className="admit-card-header">
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#000' }}>
                                      Batch {batch.batch_number}
                                    </span>
                                    <span className="batch-badge">{batch.question_count} Qs</span>
                                  </div>
                                  <div className="admit-card-body">
                                    {mix && (
                                      <>
                                        <div className="admit-card-stat">
                                          <span className="label">Easy</span>
                                          <span className="value" style={{ color: 'var(--sage)' }}>{mix.easy || 0}</span>
                                        </div>
                                        <div className="admit-card-stat">
                                          <span className="label">Med</span>
                                          <span className="value" style={{ color: 'var(--partial)' }}>{mix.medium || 0}</span>
                                        </div>
                                        <div className="admit-card-stat">
                                          <span className="label">Hard</span>
                                          <span className="value" style={{ color: 'var(--clay)' }}>{mix.hard || 0}</span>
                                        </div>
                                      </>
                                    )}
                                    <div className="admit-card-stat" style={{ marginLeft: 'auto' }}>
                                      <span className="label">Added</span>
                                      <span className="value" style={{ fontSize: '0.78rem' }}>
                                        {new Date(batch.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Attempts */}
      {recentAttempts.length > 0 && (
        <div className="animate-up" style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={20} /> Recent Attempts
            </h2>
            <a href="/mentor/results" style={{ fontSize: '0.85rem', color: 'var(--ruby)' }}>View all →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentAttempts.map((a: {
              id: string;
              student: { name: string };
              batch: { batch_number: number; chapter: { name: string; subject: { name: string } } };
              mode: string;
              percentage: number | null;
              submitted_at: string | null;
            }) => (
              <div key={a.id} className="card" style={{ padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {a.student?.name} — {a.batch?.chapter?.subject?.name} › {a.batch?.chapter?.name} (Batch {a.batch?.batch_number})
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--cream-dim)', opacity: 0.6, marginTop: '2px' }}>
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleString('en-IN') : 'In progress'}
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', fontSize: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                  background: a.mode === 'exam' ? 'var(--ruby)' : 'var(--sage)',
                  color: a.mode === 'exam' ? '#FFF' : '#000',
                  border: '2px solid #000',
                }}>
                  {a.mode}
                </span>
                {a.percentage != null && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: a.percentage >= 60 ? 'var(--sage)' : a.percentage >= 40 ? 'var(--partial)' : 'var(--clay)' }}>
                    {a.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
