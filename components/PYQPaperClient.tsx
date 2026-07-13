'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Search, Languages, ChevronDown, ChevronUp, Image } from 'lucide-react';

interface Paper {
  id: string; paper_name: string; paper_title: string | null;
  year: number; exam_type: string; pdf_url: string | null;
  has_images: boolean; total_questions: number;
}

interface Content {
  language: string; passage: string | null; question_text: string | null;
  statements: string[] | null; options: string[] | null;
}

interface Question {
  id: string; question_number: string; question_type: string | null;
  page_start: number | null; page_end: number | null;
  images: string[] | null; tables: string[] | null;
  marks: number | null; word_limit: number | null;
  sort_order: number; content: Content | null;
  sub_questions: Question[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const IMAGE_BASE   = `${SUPABASE_URL}/storage/v1/object/public/papers-images`;

function imageUrl(paperName: string, filename: string) {
  return `${IMAGE_BASE}/${paperName}/${filename}`;
}

const TYPE_TAG: Record<string, string> = {
  'MCQ': 'MCQ', 'Statement Based': 'STMT', 'Assertion Reason': 'A/R',
  'Passage Based': 'PASS', 'Match the Following': 'MATCH',
  'Descriptive': 'DESC', 'Essay': 'ESSAY', 'Essay Topic': 'ESSAY',
};

export default function PYQPaperClient({ paper }: { paper: Paper }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'english' | 'hindi'>('english');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (lang: string, q?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ paper_id: paper.id, language: lang });
    if (q?.trim()) params.set('search', q.trim());
    const res = await fetch(`/api/pyq/questions?${params}`);
    const data = await res.json();
    setQuestions(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [paper.id]);

  useEffect(() => {
    fetchQuestions(language, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchQuestions(language, search);
  }

  const isPrelims = paper.exam_type.includes('Prelims');

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '900px' }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/student/pyq')} style={{ marginBottom: '1.25rem' }}>
        <ArrowLeft size={16} /> All Papers
      </button>

      {/* Header */}
      <div className="animate-up" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {paper.exam_type}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.1rem', color: 'var(--ruby)', marginTop: '0.2rem' }}>
              {paper.year}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: '0.25rem', opacity: 0.6 }}>
              {paper.total_questions} questions
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Language toggle */}
            <button
              onClick={() => setLanguage(l => l === 'english' ? 'hindi' : 'english')}
              className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
              title="Toggle language"
            >
              <Languages size={15} />
              {language === 'english' ? 'हिन्दी' : 'English'}
            </button>
            {/* PDF download */}
            {paper.pdf_url && (
              <a
                href={paper.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
              >
                <Download size={14} /> Download PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cream-dim)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder="Search within this paper…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', fontSize: '0.88rem', padding: '0.55rem 0.75rem 0.55rem 2.2rem' }}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.55rem 1.25rem' }}>Search</button>
        {search && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); fetchQuestions(language); }}>
            Clear
          </button>
        )}
      </form>

      {/* Count */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cream-dim)', marginBottom: '1rem', opacity: 0.7 }}>
        {loading ? 'Loading…' : `${questions.length} question${questions.length !== 1 ? 's' : ''}${search ? ' (filtered)' : ''}`}
      </div>

      {/* Questions */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ border: 'var(--border-thick)', padding: '1.25rem', background: 'var(--bg-3)', opacity: 0.4, height: '80px' }} />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div style={{ border: 'var(--border-thick)', padding: '3rem', textAlign: 'center', background: 'var(--bg-3)' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.4 }}>
            {search ? 'No questions match your search.' : 'No questions found.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {questions.map(q => (
            <QuestionCard
              key={q.id}
              question={q}
              isPrelims={isPrelims}
              paperName={paper.paper_name}
              expanded={expandedId === q.id}
              onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question, isPrelims, paperName, expanded, onToggle,
}: {
  question: Question; isPrelims: boolean; paperName: string;
  expanded: boolean; onToggle: () => void;
}) {
  const c = question.content;
  const typeTag = question.question_type ? (TYPE_TAG[question.question_type] ?? question.question_type.toUpperCase().slice(0, 5)) : null;
  const hasSubQ = question.sub_questions.length > 0;
  const hasImages = question.images && question.images.length > 0;

  return (
    <div style={{ border: 'var(--border-thick)', boxShadow: 'var(--shadow-btn)', background: 'var(--bg-3)', overflow: 'hidden' }}>
      {/* Question header row */}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.9rem 1.1rem', cursor: 'pointer', background: expanded ? '#000' : 'var(--bg-3)', transition: 'background 100ms', flexWrap: 'wrap' }}
      >
        {/* Q number */}
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.95rem', color: expanded ? '#FFF' : 'var(--ruby)', flexShrink: 0, minWidth: '2rem' }}>
          Q{question.question_number}
        </span>

        {/* Question text preview */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {c?.passage && (
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: expanded ? 'rgba(255,255,255,0.6)' : 'var(--cream-dim)', marginBottom: '0.25rem', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)' }}>
              [Passage] {c.passage.slice(0, 80)}…
            </div>
          )}
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: expanded ? '#FFF' : 'var(--ink)', lineHeight: 1.4, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)' }}>
            {hasSubQ
              ? (c?.question_text ?? `${question.sub_questions.length} sub-questions`)
              : (c?.question_text ? c.question_text.slice(0, 120) + (c.question_text.length > 120 ? '…' : '') : '(No text)')}
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          {typeTag && (
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.6rem', textTransform: 'uppercase', padding: '2px 6px', background: expanded ? 'rgba(255,255,255,0.15)' : 'var(--ruby)', color: '#FFF', border: expanded ? '1px solid rgba(255,255,255,0.3)' : 'none' }}>
              {typeTag}
            </span>
          )}
          {question.marks && (
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.65rem', padding: '2px 6px', background: 'transparent', color: expanded ? 'rgba(255,255,255,0.6)' : 'var(--cream-dim)', border: `1px solid ${expanded ? 'rgba(255,255,255,0.3)' : '#CCC'}` }}>
              {question.marks}m
            </span>
          )}
          {hasImages && (
            <Image size={12} style={{ color: expanded ? 'rgba(255,255,255,0.6)' : 'var(--cream-dim)' }} />
          )}
          {expanded ? <ChevronUp size={15} color={expanded ? '#FFF' : 'var(--ink)'} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="animate-in" style={{ padding: '1.25rem', borderTop: '2px solid #000', background: '#FFF' }}>
          <QuestionBody question={question} paperName={paperName} isPrelims={isPrelims} />
        </div>
      )}
    </div>
  );
}

function QuestionBody({ question, paperName, isPrelims }: { question: Question; paperName: string; isPrelims: boolean }) {
  const c = question.content;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Passage */}
      {c?.passage && (
        <div style={{ padding: '1rem', background: 'var(--bg-3)', border: '2px solid #000', fontSize: '0.88rem', lineHeight: 1.7, fontFamily: 'var(--font-body)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
          {c.passage}
        </div>
      )}

      {/* Images */}
      {question.images && question.images.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {question.images.map(img => (
            <img
              key={img}
              src={imageUrl(paperName, img)}
              alt={img}
              style={{ maxWidth: '100%', border: '2px solid #000', background: '#f9f9f9' }}
            />
          ))}
        </div>
      )}

      {/* Tables */}
      {question.tables && question.tables.map((table, i) => (
        <div key={i} style={{ overflowX: 'auto', fontSize: '0.83rem', fontFamily: 'var(--font-mono)', background: 'var(--bg-3)', padding: '0.75rem', border: '2px solid #000', whiteSpace: 'pre' }}>
          {table}
        </div>
      ))}

      {/* Statements */}
      {c?.statements && c.statements.length > 0 && (
        <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0 }}>
          {c.statements.map((stmt, i) => (
            <li key={i} style={{ fontSize: '0.88rem', lineHeight: 1.6, fontFamily: 'var(--font-body)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              {stmt}
            </li>
          ))}
        </ol>
      )}

      {/* Question text */}
      {c?.question_text && (
        <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.5, fontFamily: 'var(--font-body)', textTransform: 'none', letterSpacing: 0 }}>
          {c.question_text}
        </div>
      )}

      {/* Options (Prelims MCQ) */}
      {isPrelims && c?.options && c.options.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.4rem' }}>
          {c.options.map((opt, i) => (
            <div key={i} style={{ padding: '0.6rem 0.9rem', border: '2px solid #000', background: 'var(--bg-3)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
              {opt}
            </div>
          ))}
        </div>
      )}

      {/* Word limit / marks */}
      {(question.marks || question.word_limit) && (
        <div style={{ display: 'flex', gap: '0.75rem', borderTop: '2px dashed #CCC', paddingTop: '0.75rem' }}>
          {question.marks && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--ruby)' }}>{question.marks} Marks</span>}
          {question.word_limit && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--cream-dim)' }}>~{question.word_limit} words</span>}
          {question.page_start && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cream-dim)', opacity: 0.6, marginLeft: 'auto' }}>Pg. {question.page_start}</span>}
        </div>
      )}

      {/* Sub-questions */}
      {question.sub_questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '2px solid #000', paddingTop: '1rem' }}>
          {question.sub_questions.map(sq => (
            <div key={sq.id} style={{ paddingLeft: '1rem', borderLeft: '4px solid var(--ruby)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.8rem', color: 'var(--ruby)', marginBottom: '0.5rem' }}>
                Q{sq.question_number}
              </div>
              <QuestionBody question={sq} paperName={paperName} isPrelims={isPrelims} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
