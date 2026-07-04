'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Question, Verdict } from '@/lib/types';
import { Brain, AlertTriangle, Sparkles } from 'lucide-react';
import QuestionText from '@/components/QuestionText';

interface Props {
  batch: any;
  questions: Question[];
  attemptId: string;
}

export default function PracticeClient({ batch, questions, attemptId }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const router = useRouter();

  // Refs to measure card heights so we can animate the container properly
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef  = useRef<HTMLDivElement>(null);
  const [innerHeight, setInnerHeight] = useState<number | undefined>(undefined);

  const currentQ   = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;
  const currentAns = currentQ ? answers[currentQ.id] : null;
  const isFlipped  = !!currentAns && currentAns.verdict !== 'unanswered';
  const verdict    = currentAns?.verdict || null;
  const aiFeedback = currentAns?.aiFeedback || null;

  // Recalculate container height whenever flipped state or AI content changes
  useEffect(() => {
    const update = () => {
      const el = isFlipped ? backRef.current : frontRef.current;
      if (el) setInnerHeight(el.scrollHeight);
    };
    update();
    // Small delay so DOM has painted new content
    const t = setTimeout(update, 50);
    return () => clearTimeout(t);
  }, [isFlipped, currentIndex, currentAns?.aiDetailedExplanation]);

  useEffect(() => {
    if (currentQ) setStudentAnswer(answers[currentQ.id]?.studentAnswer || '');
  }, [currentIndex, currentQ, answers]);

  async function handleMCQSubmit(option: string, index: number) {
    if (isFlipped) return;
    setStudentAnswer(option);
    const optLetter   = String.fromCharCode(65 + index).toLowerCase();
    const ans         = currentQ.answer.toLowerCase().trim();
    const optText     = option.toLowerCase().trim();
    const stripPrefix = (s: string) => s.replace(/^(\([a-d]\)|[a-d]\)|[a-d]\.)\s*/, '').trim();
    const isCorrect   =
      optText === ans ||
      stripPrefix(optText) === stripPrefix(ans) ||
      ans === optLetter ||
      ans === `(${optLetter})` ||
      ans === `${optLetter}.` ||
      ans === `${optLetter})`;
    const v: Verdict = isCorrect ? 'correct' : 'incorrect';
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: { questionId: currentQ.id, studentAnswer: option, verdict: v, aiFeedback: null, marksAwarded: isCorrect ? 1 : 0 }
    }));
  }

  async function handleShortAnswerSubmit() {
    if (!studentAnswer.trim()) return;
    setLoading(true);
    try {
      const res  = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQ.question, correctAnswer: currentQ.answer, explanation: currentQ.explanation, studentAnswer }),
      });
      const data = await res.json();
      const v: Verdict = data.verdict || 'incorrect';
      setAnswers(prev => ({
        ...prev,
        [currentQ.id]: { questionId: currentQ.id, studentAnswer, verdict: v, aiFeedback: data.feedback, marksAwarded: v === 'correct' ? 1 : v === 'partial' ? 0.5 : 0 }
      }));
    } catch { /* keep loading false */ }
    finally   { setLoading(false); }
  }

  function handleSkip() {
    if (!answers[currentQ.id]) {
      setAnswers(prev => ({ ...prev, [currentQ.id]: { questionId: currentQ.id, studentAnswer: '', verdict: 'unanswered', aiFeedback: null, marksAwarded: 0 } }));
    }
    setCurrentIndex(prev => prev + 1);
  }

  function handleNext() { setCurrentIndex(prev => prev + 1); }

  async function handleFinish() {
    setLoading(true);
    let correct = 0;
    const arr = Object.values(answers);
    arr.forEach(a => { if (a.verdict === 'correct') correct += 1; else if (a.verdict === 'partial') correct += 0.5; });
    const percentage = questions.length > 0 ? (correct / questions.length) * 100 : 0;
    await fetch('/api/attempts/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, answers: arr, score: correct, percentage }),
    });
    router.push(`/student/results/${attemptId}`);
  }

  async function handleExplainMore() {
    if (loadingExplanation || currentAns?.aiDetailedExplanation) return;
    setLoadingExplanation(true);
    try {
      const res  = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQ.question, answer: currentQ.answer, explanation: currentQ.explanation }),
      });
      const data = await res.json();
      if (data.explanation) {
        setAnswers(prev => ({ ...prev, [currentQ.id]: { ...prev[currentQ.id], aiDetailedExplanation: data.explanation } }));
      }
    } catch { /* silent fail */ }
    finally { setLoadingExplanation(false); }
  }

  /* ── Finished screen ─────────────────────────────────── */
  if (isFinished) {
    return (
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <h2>Practice Complete!</h2>
        <p style={{ marginBottom: '2rem' }}>You've finished all questions in this batch.</p>
        <button className="btn btn-primary" onClick={handleFinish} disabled={loading}>
          {loading ? 'Saving...' : 'View Results'}
        </button>
      </div>
    );
  }

  /* ── MCQ option colour helper ────────────────────────── */
  function optClass(opt: string, i: number) {
    if (!isFlipped) return '';
    const optLetter = String.fromCharCode(65 + i).toLowerCase();
    const ans  = currentQ.answer.toLowerCase().trim();
    const text = opt.toLowerCase().trim();
    const strip = (s: string) => s.replace(/^(\([a-d]\)|[a-d]\)|[a-d]\.)\s*/, '').trim();
    const isCorrect = text === ans || strip(text) === strip(ans) || ans === optLetter || ans === `(${optLetter})` || ans === `${optLetter}.` || ans === `${optLetter})`;
    const isChosen  = currentAns?.studentAnswer === opt;
    if (isCorrect) return 'correct';
    if (isChosen && !isCorrect) return 'incorrect';
    return '';
  }

  /* ── FRONT card content ──────────────────────────────── */
  const frontCard = (
    <div ref={frontRef} style={{ padding: '1.75rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <span className={`pill pill-${currentQ.difficulty}`}>{currentQ.difficulty}</span>
        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '3px 8px', background: '#000', color: '#FFF', textTransform: 'uppercase' }}>
          {currentQ.type}
        </span>
      </div>

      <QuestionText text={currentQ.question} style={{ marginBottom: '1.75rem' }} />

      {currentQ.type === 'mcq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {currentQ.options?.map((opt, i) => (
            <div
              key={i}
              className={`omr-option ${optClass(opt, i)}`}
              onClick={() => !isFlipped && handleMCQSubmit(opt, i)}
              style={{ cursor: isFlipped ? 'default' : 'pointer', pointerEvents: isFlipped ? 'none' : 'auto' }}
            >
              <div className="omr-bubble"><span>{String.fromCharCode(65 + i)}</span></div>
              <span className="omr-option-text">{opt}</span>
            </div>
          ))}
          {!isFlipped && (
            <button className="btn btn-ghost w-full" onClick={handleSkip} style={{ justifyContent: 'center', marginTop: '0.25rem', opacity: 0.6, fontSize: '0.88rem' }}>
              Skip this question
            </button>
          )}
        </div>
      )}

      {currentQ.type === 'short' && !isFlipped && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <textarea className="input" placeholder="Type your answer here..." value={studentAnswer} onChange={e => setStudentAnswer(e.target.value)} style={{ minHeight: '120px' }} />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleShortAnswerSubmit} disabled={loading || !studentAnswer.trim()} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? 'Checking...' : 'Submit Answer'}
            </button>
            <button className="btn btn-ghost" onClick={handleSkip} disabled={loading} style={{ opacity: 0.6 }}>Skip</button>
          </div>
        </div>
      )}

      {currentQ.type === 'short' && isFlipped && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--sage-bg)', border: 'var(--border-thick)', fontSize: '0.9rem' }}>
          <strong>Your answer:</strong> {currentAns?.studentAnswer}
        </div>
      )}
    </div>
  );

  /* ── BACK card content ───────────────────────────────── */
  const backCard = (
    <div ref={backRef} style={{ padding: '1.75rem' }}>
      {/* Verdict */}
      <div style={{
        fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900,
        fontFamily: 'var(--font-heading)',
        color:      verdict === 'correct' ? '#000' : verdict === 'partial' ? '#000' : '#FFF',
        background: verdict === 'correct' ? 'var(--sage)' : verdict === 'partial' ? 'var(--partial-bg)' : 'var(--ruby)',
        display: 'inline-block', padding: '4px 10px', marginBottom: '1.25rem', border: 'var(--border-thick)',
      }}>
        {verdict}
      </div>

      {/* Correct Answer */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem', opacity: 0.5 }}>Correct Answer</div>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.5, textTransform: 'none' }}>{currentQ.answer}</p>
      </div>

      {/* AI short feedback (short answers) */}
      {aiFeedback && (
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.04)', border: 'var(--border-thin)', marginBottom: '1.25rem', fontSize: '0.9rem', lineHeight: 1.55 }}>
          <strong>AI Feedback:</strong> {aiFeedback}
        </div>
      )}

      {/* Explanation */}
      {currentQ.explanation && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ruby)', marginBottom: '0.3rem' }}>Explanation</div>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.65, textTransform: 'none', fontWeight: 400 }}>{currentQ.explanation}</p>
        </div>
      )}

      {/* Keywords */}
      {currentQ.keywords && currentQ.keywords.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem', opacity: 0.5 }}>Keywords</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {currentQ.keywords.map((k, i) => <span key={i} style={{ fontSize: '0.78rem', background: '#000', color: '#FFF', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{k}</span>)}
          </div>
        </div>
      )}

      {/* Memory trick / exam trap */}
      {(currentQ.memory_trick || currentQ.exam_trap) && (
        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column', marginBottom: '1.5rem' }}>
          {currentQ.memory_trick && (
            <div style={{ background: 'var(--sage-bg)', borderLeft: '4px solid #000', padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Brain size={16} style={{ flexShrink: 0, marginTop: '3px' }} />
              <div style={{ fontSize: '0.9rem' }}><strong>Trick:</strong> {currentQ.memory_trick}</div>
            </div>
          )}
          {currentQ.exam_trap && (
            <div style={{ background: 'var(--clay-bg)', borderLeft: '4px solid var(--ruby)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '3px' }} />
              <div style={{ fontSize: '0.9rem' }}><strong>Trap:</strong> {currentQ.exam_trap}</div>
            </div>
          )}
        </div>
      )}

      {/* AI Detailed Explanation */}
      {currentAns?.aiDetailedExplanation && (
        <div style={{ padding: '1.25rem', background: 'var(--sage-bg)', border: 'var(--border-thick)', marginBottom: '1.5rem', fontSize: '0.92rem', lineHeight: 1.75 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', color: '#000' }}>
            <Sparkles size={13} /> AI Detailed Explanation
          </div>
          <p style={{ textTransform: 'none', fontWeight: 400, margin: 0, whiteSpace: 'pre-wrap' }}>{currentAns.aiDetailedExplanation}</p>
        </div>
      )}

      {/* Explain More button */}
      {!currentAns?.aiDetailedExplanation && (
        <button
          className="btn btn-ghost w-full"
          onClick={handleExplainMore}
          disabled={loadingExplanation}
          style={{ justifyContent: 'center', marginBottom: '1.5rem', borderStyle: 'dashed', gap: '0.5rem' }}
        >
          {loadingExplanation
            ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Generating AI explanation…</>
            : <><Sparkles size={14} /> Explain More with AI</>}
        </button>
      )}

      {/* Next button inside the back card */}
      <button className="btn btn-primary w-full" onClick={handleNext} style={{ justifyContent: 'center' }}>
        Next Question →
      </button>
    </div>
  );

  /* ── Main render ─────────────────────────────────────── */
  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>

      {/* Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', fontWeight: 500 }}>{batch.chapter.subject.name} › {batch.chapter.name}</div>
          <div className="batch-badge">{currentIndex + 1} / {questions.length}</div>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'var(--bg-3)', border: 'var(--border-thin)', overflow: 'hidden' }}>
          <div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, height: '100%', background: 'var(--ruby)', transition: 'width 200ms ease-out' }} />
        </div>
      </div>

      {/* Flip Card — container height dynamically tracks whichever face is active */}
      <div className="study-card-wrap" style={{ marginBottom: '1.5rem' }}>
        <div
          className={`study-card-inner ${isFlipped ? 'flipped' : ''}`}
          style={{ height: innerHeight ? `${innerHeight}px` : undefined, transition: 'transform 500ms cubic-bezier(0.16,1,0.3,1), height 300ms ease' }}
        >
          {/* FRONT */}
          <div className="study-card-face card" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {frontCard}
          </div>

          {/* BACK */}
          <div className="study-card-face study-card-back card-paper" style={{ position: 'absolute', top: 0, left: 0, right: 0, minHeight: '100%', overflow: 'visible' }}>
            {backCard}
          </div>
        </div>
      </div>

      {/* Navigation row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => setCurrentIndex(c => c - 1)} disabled={currentIndex === 0}>
          ← Previous
        </button>
        {currentIndex === questions.length - 1 ? (
          <button className="btn btn-primary" onClick={handleFinish} disabled={loading}>
            {loading ? 'Saving...' : 'Finish Practice'}
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={() => setCurrentIndex(c => c + 1)} disabled={!isFlipped}>
            Skip →
          </button>
        )}
      </div>
    </div>
  );
}
