'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FlaskConical, PenTool, RefreshCw, BookOpen, BookText, FileText, BarChart3, ClipboardList, Library, Search, ChevronRight, Map, Download, Edit2, Check, X } from 'lucide-react';

const PROMPT_1 = `You are an expert researcher, subject matter expert, competitive exam analyst, and curriculum designer.

Your task is to build the most comprehensive knowledge base for the following topic:

Topic: <TOPIC NAME>

## Objective
Research this topic exhaustively and collect every reliable resource required for competitive exam preparation.

## Collect Resources From
### Official Sources
* Government publications, Official Acts / Rules / Policies, Official websites, NCERT, NIOS, Parliament / Ministries (where applicable)

### Standard Books
* Standard textbooks, University books, Reference books, Recommended books for competitive exams

### Previous Year Papers
Collect questions related to this topic from: IIS, SSC CGL, SSC CHSL, SSC CPO, UPSC Prelims, UPSC Mains, CDS, NDA, CAPF, State PSC, Banking, Railways, Other Government Exams. Search across all available years.

### Educational Sources
* Reputed coaching institutes, Educational portals, University notes, Research papers, Trusted articles

## Collect
* Complete theory, Definitions, Concepts, Formulas (if applicable), Important facts, Important dates, Important people, Acts, Articles, Committees, Cases, Diagrams, Tables, Flowcharts, Exceptions, Frequently confused concepts, Mnemonics

## Previous Year Question Collection
Extract every question related to this topic. For every question identify: Exam, Year, Stage, Topic, Difficulty, Question Type

## Trend Analysis
Identify: Frequently asked concepts, Repeated questions, Rare questions, High-weightage concepts, Future high-probability concepts

## Final Deliverable
Create a complete knowledge base. Do NOT generate questions yet.`;

const PROMPT_2 = `Using the collected knowledge base, perform a complete audit.

Report:
* Total resources
* Total PYQs
* Duplicate PYQs removed
* Total unique PYQs
* Estimated AI questions
* Easy AI questions
* Medium AI questions
* Hard AI questions
* Twisted AI questions
* Total question bank

Show:
* Year-wise distribution
* Exam-wise distribution
* Topic-wise distribution
* Difficulty distribution

Finally tell me:
* Number of 25-question batches
* Number of 50-question batches
* Number of complete revision cycles

Do NOT generate questions.`;

const PROMPT_3 = `Generate the next batch of exactly 25 unique questions.

Generation Order:
1. Exhaust every Previous Year Question first.
2. Then generate AI Predicted Questions.

Generation Priority: PYQs, Easy AI, Medium AI, Hard AI, Twisted AI

Never repeat questions. Never skip questions. Continue from the previous batch.

For every question include:
* Master ID
* Difficulty
* Question Category
* Exam Name
* Year
* Stage
* Question
* Options
* Answer
* Detailed Explanation
* Keywords
* Related Acts / Articles / Dates / Committees / Personalities
* Memory Trick
* Common Exam Trap
* Why Important
* Sources

At the end display:
* Questions Covered
* Questions Remaining
* Total Completed
* Total Remaining
* Percentage Completed`;

const PROMPT_4 = `You are a JSON data formatter.

I will paste multiple batches of questions.

Do not generate JSON until I say:
Generate Final JSON

Until then:
* Merge all batches.
* Remove duplicates.
* Validate IDs.
* Preserve every field.
* Preserve explanations exactly.
* Fill missing values with empty strings or arrays.

When I say Generate Final JSON, first ask for:
* Subject
* Chapter
* Version
* Batch Number
* Description

Then generate a production-ready JSON with:
* Metadata
* Statistics
* Complete Question Bank
* Valid IDs
* Structured Related Data
* Sources

Output only valid JSON.`;

const PROMPT_5 = `You already know the topic from our previous conversation because you generated the questions for it.

**Do NOT generate questions again.**

Your task is to generate a **complete, structured knowledge base** for this topic that can be directly converted into a **Mind Map / Knowledge Graph / Timeline**.

## Instructions
* Cover the topic from the earliest relevant event to the latest.
* Include every important event, amendment, act, committee, commission, report, court case, personality, agreement, movement, policy, reform, article, institution, or milestone.
* If multiple important events occurred in the same year, include each separately.
* Keep information factual, concise, and complete.
* Do not generate MCQs or questions.

For every record include:
* Year, Date (if known), Event Name, Alternative Names, Category
* Key People, What Happened, Background, Why it Happened, Objectives, Major Features, Important Changes
* Immediate Impact, Long-term Impact
* Significance (Constitutional, Political, Economic, Administrative, Social, Scientific)
* Related (Articles, Acts, Amendments, Committees, Commissions, Court Cases, Reports, Personalities, Organizations, Institutions, Keywords)
* Memory Trick (if useful), Previous Event, Next Event, Source

## Output Rules
* Return ONLY valid JSON. No Markdown.
* Every field/array must exist even if empty.
* Sort records chronologically.

Use this schema:
{
"title": "",
"topic": "",
"description": "",
"records": [
{
"year": "",
"date": "",
"event": "",
"aliases": [],
"category": "",
"people": [],
"background": "",
"why": "",
"what_happened": "",
"objectives": [],
"features": [],
"changes": [],
"impact": { "immediate": [], "long_term": [] },
"significance": { "constitutional": "", "political": "", "economic": "", "administrative": "", "social": "", "scientific": "" },
"related": { "articles": [], "acts": [], "amendments": [], "committees": [], "commissions": [], "court_cases": [], "reports": [], "organizations": [], "institutions": [], "personalities": [], "keywords": [] },
"memory_trick": "",
"previous_event": "",
"next_event": "",
"sources": []
}
]
}`;

const INITIAL_PROMPTS = [
  { num: 1, title: 'Resource Collection', subtitle: 'Build knowledge base', content: PROMPT_1, icon: <FlaskConical size={18} /> },
  { num: 2, title: 'Audit', subtitle: 'Analyze PYQs and estimate batches', content: PROMPT_2, icon: <BarChart3 size={18} /> },
  { num: 3, title: 'Question Generation', subtitle: 'Generate exactly 25 unique questions', content: PROMPT_3, icon: <PenTool size={18} /> },
  { num: 4, title: 'JSON Builder', subtitle: 'Merge batches and output valid JSON', content: PROMPT_4, icon: <RefreshCw size={18} /> },
  { num: 5, title: 'Mind Map Builder', subtitle: 'Generate chronological knowledge graph', content: PROMPT_5, icon: <Map size={18} /> },
];

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subjects: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentAttempts: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  studyMaterials: any[];
}

export default function MentorDashboardClient({ subjects, recentAttempts, studyMaterials }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [prompts, setPrompts] = useState(INITIAL_PROMPTS);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingSubject, setEditingSubject] = useState<{ id: string, name: string } | null>(null);
  const [editingChapter, setEditingChapter] = useState<{ id: string, name: string } | null>(null);
  const [topicName, setTopicName] = useState('');

  async function handleSaveSubject(id: string, oldName: string) {
    if (!editingSubject || editingSubject.name.trim() === '' || editingSubject.name === oldName) {
      setEditingSubject(null);
      return;
    }
    await supabase.from('subjects').update({ name: editingSubject.name }).eq('id', id);
    setEditingSubject(null);
    startTransition(() => router.refresh());
  }

  async function handleSaveChapter(id: string, oldName: string) {
    if (!editingChapter || editingChapter.name.trim() === '' || editingChapter.name === oldName) {
      setEditingChapter(null);
      return;
    }
    await supabase.from('chapters').update({ name: editingChapter.name }).eq('id', id);
    setEditingChapter(null);
    startTransition(() => router.refresh());
  }

  function copyPrompt(text: string, idx: number) {
    const finalContent = text.replace(/<TOPIC NAME>/g, topicName || '<TOPIC NAME>');
    navigator.clipboard.writeText(finalContent);
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
          { label: 'Study Materials', value: studyMaterials.length, icon: <Map size={24} /> },
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={20} /> Question Pipeline Prompts
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Topic:</span>
              <input
                className="input"
                placeholder="e.g. Fundamental Rights"
                value={topicName}
                onChange={e => setTopicName(e.target.value)}
                style={{ width: '220px', padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: 'auto' }}
              />
            </div>
            <a href="/mentor/add-test" className="btn btn-primary btn-sm">+ Add Test</a>
          </div>
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
                <div className="prompt-box" style={{ whiteSpace: 'pre-wrap' }}>
                  {p.content.replace(/<TOPIC NAME>/g, topicName || '<TOPIC NAME>')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Study Materials Library */}
      <div className="animate-up" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Map size={20} /> Study Materials
          </h2>
          <a href="/mentor/add-study" className="btn btn-primary btn-sm">+ Add Study Material</a>
        </div>

        {studyMaterials.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
            No study materials yet. Upload a mind-map or timeline!
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {studyMaterials.map((m: {
              id: string;
              title: string;
              material_type: string;
              created_at: string;
              chapter: { name: string; subject: { name: string } };
            }) => (
              <div key={m.id} className="admit-card" style={{ flexBasis: '240px', flexGrow: 1, cursor: 'default' }}>
                <div className="admit-card-header" style={{ background: 'var(--partial-bg)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700 }}>
                    {m.chapter?.subject?.name}
                  </span>
                  <span className="batch-badge" style={{ background: 'var(--ink)' }}>
                    {m.material_type === 'mind_map' ? 'MAP' : 'NOTE'}
                  </span>
                </div>
                <div style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', lineHeight: 1.3 }}>{m.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', opacity: 0.6 }}>
                    {m.chapter?.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', opacity: 0.5, marginTop: '0.4rem' }}>
                    {new Date(m.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                      {editingSubject?.id === subject.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                          <input 
                            className="input" 
                            value={editingSubject.name} 
                            onChange={e => setEditingSubject({ ...editingSubject, name: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleSaveSubject(subject.id, subject.name)}
                            autoFocus
                            style={{ padding: '0.2rem 0.5rem', minHeight: 'auto', fontSize: '1rem', width: '200px' }}
                          />
                          <button className="btn btn-primary btn-sm" style={{ padding: '4px' }} onClick={() => handleSaveSubject(subject.id, subject.name)}><Check size={14}/></button>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '4px', background: '#FFF' }} onClick={() => setEditingSubject(null)}><X size={14}/></button>
                        </div>
                      ) : (
                        <>
                          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--cream)' }}>
                            {subject.name}
                          </span>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '2px', opacity: 0.6, color: '#FFF' }} onClick={(e) => { e.stopPropagation(); setEditingSubject({ id: subject.id, name: subject.name }); }}>
                            <Edit2 size={14}/>
                          </button>
                        </>
                      )}
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
                          {editingChapter?.id === chapter.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', paddingLeft: '0.5rem', borderLeft: '4px solid #000' }}>
                              <input 
                                className="input" 
                                value={editingChapter.name} 
                                onChange={e => setEditingChapter({ ...editingChapter, name: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleSaveChapter(chapter.id, chapter.name)}
                                autoFocus
                                style={{ padding: '0.2rem 0.5rem', minHeight: 'auto', fontSize: '0.88rem', width: '250px' }}
                              />
                              <button className="btn btn-primary btn-sm" style={{ padding: '4px' }} onClick={() => handleSaveChapter(chapter.id, chapter.name)}><Check size={14}/></button>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '4px' }} onClick={() => setEditingChapter(null)}><X size={14}/></button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', paddingLeft: '0.5rem', borderLeft: '4px solid #000' }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', color: '#000' }}>
                                {chapter.name}
                              </div>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '2px', opacity: 0.5, color: '#000' }} onClick={() => setEditingChapter({ id: chapter.id, name: chapter.name })}>
                                <Edit2 size={13}/>
                              </button>
                            </div>
                          )}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {chapter.test_batches.map((batch) => {
                              const mix = batch.difficulty_mix as Record<string, number> | null;
                                return (
                                <div key={batch.id} className="admit-card" style={{ flexBasis: '220px', flexGrow: 1, cursor: 'default' }}>
                                  <div className="admit-card-header">
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#000' }}>
                                      Batch {batch.batch_number}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      <span className="batch-badge">{batch.question_count} Qs</span>
                                      <a href={`/api/tests/${batch.id}/download`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink)' }} title="Download JSON">
                                        <Download size={14} />
                                      </a>
                                    </div>
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
