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
  existingAnswers?: any[];
}

export default function PracticeClient({ batch, questions, attemptId, existingAnswers = [] }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    existingAnswers.forEach(ans => {
      map[ans.question_id] = {
        questionId: ans.question_id,
        studentAnswer: ans.student_answer,
        verdict: ans.verdict,
        aiFeedback: ans.ai_feedback,
        aiDetailedExplanation: ans.ai_detailed_explanation,
        marksAwarded: ans.marks_awarded
      };
    });
    return map;
  });

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (existingAnswers.length === 0) return 0;
    const firstUnansweredIndex = questions.findIndex(q => {
      const ans = existingAnswers.find(a => a.question_id === q.id);
      return !ans || ans.verdict === 'unanswered';
    });
    return firstUnansweredIndex === -1 ? 0 : firstUnansweredIndex;
  });

  const [studentAnswer, setStudentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const router = useRouter();

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef  = useRef<HTMLDivElement>(null);
  const [innerHeight, setInnerHeight] = useState<number | undefined>(undefined);

  const currentQ   = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;
  const currentAns = currentQ ? answers[currentQ.id] : null;
  const isFlipped  = showExplanation && !!currentAns && currentAns.verdict !== 'unanswered';
  const verdict    = currentAns?.verdict || null;
  const aiFeedback = currentAns?.aiFeedback || null;

  useEffect(() => {
    const update = () => {
      const el = isFlipped ? backRef.current : frontRef.current;
      if (el) setInnerHeight(el.scrollHeight);
    };
    
    update();
    const t = setTimeout(update, 50);
    const t2 = setTimeout(update, 300);
    
    const el = isFlipped ? backRef.current : frontRef.current;
    let observer: ResizeObserver | null = null;
    if (el) {
      observer = new ResizeObserver(() => update());
      observer.observe(el);
    }
    
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      if (observer) observer.disconnect();
    };
  }, [isFlipped, currentIndex, currentAns?.aiDetailedExplanation]);

  useEffect(() => {
    if (currentQ) setStudentAnswer(answers[currentQ.id]?.studentAnswer || '');
  }, [currentIndex, currentQ, answers]);

  async function saveAnswer(ansData: any) {
    try {
      await fetch('/api/attempts/save-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          ...ansData
        }),
      });
    } catch (e) {
      console.error('Failed to auto-save answer:', e);
    }
  }

  async function handleMCQSubmit(option: string, index: number) {
    if (currentAns && currentAns.verdict !== 'unanswered') return;
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
    
    const ansData = { questionId: currentQ.id, studentAnswer: option, verdict: v, aiFeedback: null, marksAwarded: isCorrect ? 1 : 0 };
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: ansData
    }));
    setShowExplanation(true);
    saveAnswer(ansData);
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
      
      const ansData = { questionId: currentQ.id, studentAnswer, verdict: v, aiFeedback: data.feedback, marksAwarded: v === 'correct' ? 1 : v === 'partial' ? 0.5 : 0 };
      setAnswers(prev => ({
        ...prev,
        [currentQ.id]: ansData
      }));
      setShowExplanation(true);
      saveAnswer(ansData);
    } catch { /* keep loading false */ }
    finally   { setLoading(false); }
  }

  function handleSkip() {
    if (!answers[currentQ.id]) {
      const ansData = { questionId: currentQ.id, studentAnswer: '', verdict: 'unanswered', aiFeedback: null, marksAwarded: 0 };
      setAnswers(prev => ({ ...prev, [currentQ.id]: ansData }));
      saveAnswer(ansData);
    }
    setShowExplanation(false);
    setCurrentIndex(prev => prev + 1);
  }

  function handleNext() { 
    setShowExplanation(false);
    setCurrentIndex(prev => prev + 1); 
  }

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
        body: JSON.stringify({ 
          question: currentQ.question, 
          answer: currentQ.answer, 
          explanation: currentQ.explanation,
          studentAnswer: currentAns.studentAnswer
        }),
      });
      const data = await res.json();
      if (data.explanation) {
        setAnswers(prev => ({ ...prev, [currentQ.id]: { ...prev[currentQ.id], aiDetailedExplanation: data.explanation } }));
        saveAnswer({ ...currentAns, aiDetailedExplanation: data.explanation });
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
    if (!currentAns || currentAns.verdict === 'unanswered') return '';
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
    <>
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
              onClick={() => (!currentAns || currentAns.verdict === 'unanswered') && handleMCQSubmit(opt, i)}
              style={{ cursor: (currentAns && currentAns.verdict !== 'unanswered') ? 'default' : 'pointer', pointerEvents: (currentAns && currentAns.verdict !== 'unanswered') ? 'none' : 'auto' }}
            >
              <div className="omr-bubble"><span>{String.fromCharCode(65 + i)}</span></div>
              <span className="omr-option-text">{opt}</span>
            </div>
          ))}
        </div>
      )}

      {currentQ.type === 'short' && (!currentAns || currentAns.verdict === 'unanswered') && (
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

      {currentQ.type === 'short' && (currentAns && currentAns.verdict !== 'unanswered') && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--sage-bg)', border: 'var(--border-thick)', fontSize: '0.9rem' }}>
          <strong>Your answer:</strong> {currentAns?.studentAnswer}
        </div>
      )}

      {/* Button to flip to explanation if already answered but viewing front */}
      {(currentAns && currentAns.verdict !== 'unanswered' && !isFlipped) && (
        <button className="btn btn-primary w-full" onClick={() => setShowExplanation(true)} style={{ justifyContent: 'center', marginTop: '1.25rem' }}>
          View Explanation →
        </button>
      )}
    </>
  );

  /* ── BACK card content ───────────────────────────────── */
  const backCard = (
    <>
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
        <div style={{ padding: '1.25rem', background: 'var(--sage-bg)', border: 'var(--border-thick)', marginBottom: '1.5rem', fontSize: '0.92rem', lineHeight: 1.75, maxHeight: '300px', overflowY: 'auto' }}>
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
          style={{ 
            justifyContent: 'center', 
            marginBottom: '0', 
            borderStyle: 'dashed', 
            gap: '0.5rem',
            minHeight: '64px',
            padding: '1rem'
          }}
        >
          {loadingExplanation
            ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> GENERATING AI EXPLANATION…</>
            : <><Sparkles size={14} /> Explain More with AI</>}
        </button>
      )}
    </>
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

      {/* Flip Card — uses JS height calculation since CSS Grid + 3D transforms has dynamic height bugs in browsers */}
      <div className="study-card-wrap" style={{ marginBottom: '1.5rem', perspective: 2000 }}>
        <div
          className={`study-card-inner ${isFlipped ? 'flipped' : ''}`}
          style={{ 
            height: innerHeight ? `${innerHeight}px` : undefined,
            transition: 'transform 600ms cubic-bezier(0.16,1,0.3,1)',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'none',
            position: 'relative'
          }}
        >
          {/* FRONT */}
          <div ref={frontRef} className="study-card-face card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', zIndex: isFlipped ? 0 : 1, overflow: 'hidden' }}>
            {frontCard}
          </div>

          {/* BACK */}
          <div ref={backRef} className="study-card-face study-card-back card-paper" style={{ position: 'absolute', top: 0, left: 0, right: 0, minHeight: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', zIndex: isFlipped ? 1 : 0, overflow: 'hidden' }}>
            {backCard}
          </div>
        </div>
      </div>

      {/* Navigation row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => { setShowExplanation(false); setCurrentIndex(c => c - 1); }} 
          disabled={currentIndex === 0}
        >
          ← Previous
        </button>
        
        {currentIndex === questions.length - 1 ? (
          <button className="btn btn-primary" onClick={handleFinish} disabled={loading}>
            {loading ? 'Saving...' : 'Finish Practice'}
          </button>
        ) : (
          isFlipped ? (
            <button className="btn btn-primary" onClick={handleNext}>
              Next Question →
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={handleSkip}>
              Skip →
            </button>
          )
        )}
      </div>
    </div>
  );
}
