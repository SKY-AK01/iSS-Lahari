'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Question, Verdict } from '@/lib/types';
import { Brain, AlertTriangle } from 'lucide-react';
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
  const router = useRouter();

  const currentQ = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;

  const currentAns = currentQ ? answers[currentQ.id] : null;
  const isFlipped = !!currentAns && currentAns.verdict !== 'unanswered';
  const verdict = currentAns?.verdict || null;
  const aiFeedback = currentAns?.aiFeedback || null;

  useEffect(() => {
    if (currentQ) {
      setStudentAnswer(answers[currentQ.id]?.studentAnswer || '');
    }
  }, [currentIndex, currentQ, answers]);

  async function handleMCQSubmit(option: string, index: number) {
    if (isFlipped) return; // Prevent changing answer once flipped
    setStudentAnswer(option);
    
    const optLetter = String.fromCharCode(65 + index).toLowerCase();
    const ans = currentQ.answer.toLowerCase().trim();
    const optText = option.toLowerCase().trim();
    const stripPrefix = (s: string) => s.replace(/^(\([a-d]\)|[a-d]\)|[a-d]\.)\s*/, '').trim();
    
    const isCorrect = 
      optText === ans ||
      stripPrefix(optText) === stripPrefix(ans) ||
      ans === optLetter ||
      ans === `(${optLetter})` ||
      ans === `${optLetter}.` ||
      ans === `${optLetter})`;

    const v: Verdict = isCorrect ? 'correct' : 'incorrect';
    
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        questionId: currentQ.id,
        studentAnswer: option,
        verdict: v,
        aiFeedback: null,
        marksAwarded: isCorrect ? 1 : 0
      }
    }));
  }

  async function handleShortAnswerSubmit() {
    if (!studentAnswer.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          correctAnswer: currentQ.answer,
          explanation: currentQ.explanation,
          studentAnswer,
        }),
      });
      const data = await res.json();
      
      let v: Verdict = data.verdict;
      if (data.selfMark) {
        // Handle self-marking fallback
        v = 'incorrect'; // Can be improved
      }

      setAnswers(prev => ({
        ...prev,
        [currentQ.id]: {
          questionId: currentQ.id,
          studentAnswer,
          verdict: v,
          aiFeedback: data.feedback,
          marksAwarded: v === 'correct' ? 1 : v === 'partial' ? 0.5 : 0
        }
      }));
    } catch (e) {
      console.error(e);
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    setCurrentIndex(prev => prev + 1);
  }

  function handleSkip() {
    if (!answers[currentQ.id]) {
      setAnswers(prev => ({
        ...prev,
        [currentQ.id]: {
          questionId: currentQ.id,
          studentAnswer: '',
          verdict: 'unanswered',
          aiFeedback: null,
          marksAwarded: 0,
        }
      }));
    }
    setCurrentIndex(prev => prev + 1);
  }

  async function handleFinish() {
    setLoading(true);
    // calculate score
    let correctCount = 0;
    const answersArray = Object.values(answers);
    answersArray.forEach(a => {
      if (a.verdict === 'correct') correctCount += 1;
      else if (a.verdict === 'partial') correctCount += 0.5;
    });
    const percentage = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

    await fetch('/api/attempts/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        answers: answersArray,
        score: correctCount,
        percentage,
      }),
    });

    router.push(`/student/results/${attemptId}`);
  }

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

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
      {/* Breadcrumb + progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', fontWeight: 500 }}>
            {batch.chapter.subject.name} › {batch.chapter.name}
          </div>
          <div className="batch-badge">
            {currentIndex + 1} / {questions.length}
          </div>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'var(--bg-3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, height: '100%', background: 'var(--ruby)', transition: 'width 200ms ease-out' }} />
        </div>
      </div>

      <div className="study-card-wrap">
        <div className={`study-card-inner ${isFlipped ? 'flipped' : ''}`}>
          
          {/* FRONT (Question) */}
          <div className="study-card-face card" style={{ padding: '1.75rem' }}>
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
                    className="omr-option"
                    onClick={() => handleMCQSubmit(opt, i)}
                  >
                    <div className="omr-bubble"><span>{String.fromCharCode(65 + i)}</span></div>
                    <span className="omr-option-text">{opt}</span>
                  </div>
                ))}
                <button
                  className="btn btn-ghost w-full"
                  onClick={handleSkip}
                  style={{ justifyContent: 'center', marginTop: '0.25rem', opacity: 0.6, fontSize: '0.88rem' }}
                >
                  Skip this question
                </button>
              </div>
            )}

            {currentQ.type === 'short' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <textarea
                  className="input"
                  placeholder="Type your answer here..."
                  value={studentAnswer}
                  onChange={e => setStudentAnswer(e.target.value)}
                  style={{ minHeight: '120px' }}
                />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleShortAnswerSubmit}
                    disabled={loading || !studentAnswer.trim()}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {loading ? 'Checking...' : 'Submit Answer'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={handleSkip}
                    disabled={loading}
                    style={{ opacity: 0.6 }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BACK (Study Card) */}
          <div className="study-card-face study-card-back card-paper" style={{ padding: '1.75rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900,
                fontFamily: 'var(--font-heading)',
                color: verdict === 'correct' ? '#000' : verdict === 'partial' ? '#000' : '#FFF',
                background: verdict === 'correct' ? 'var(--sage)' : verdict === 'partial' ? 'var(--partial-bg)' : 'var(--ruby)',
                display: 'inline-block', padding: '4px 10px', marginBottom: '1rem',
                border: 'var(--border-thick)',
              }}>
                {verdict}
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', opacity: 0.5 }}>Correct Answer</div>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.5, textTransform: 'none' }}>{currentQ.answer}</p>
            </div>

            {aiFeedback && (
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <strong>AI Feedback:</strong> {aiFeedback}
              </div>
            )}

            {currentQ.explanation && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ruby)', marginBottom: '0.4rem' }}>Explanation</div>
                <p style={{ fontSize: '0.92rem', lineHeight: 1.6, textTransform: 'none', fontWeight: 400 }}>{currentQ.explanation}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {currentQ.keywords && currentQ.keywords.length > 0 && (
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', opacity: 0.5 }}>Keywords</div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {currentQ.keywords.map((k, i) => <span key={i} style={{ fontSize: '0.78rem', background: '#000', color: '#FFF', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{k}</span>)}
                  </div>
                </div>
              )}
            </div>

            {(currentQ.memory_trick || currentQ.exam_trap) && (
              <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', marginBottom: '2rem' }}>
                {currentQ.memory_trick && (
                  <div style={{ background: 'var(--sage-bg)', borderLeft: '3px solid var(--sage)', padding: '0.75rem 1rem', borderRadius: '4px', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <Brain size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div><strong>Trick:</strong> {currentQ.memory_trick}</div>
                  </div>
                )}
                {currentQ.exam_trap && (
                  <div style={{ background: 'var(--clay-bg)', borderLeft: '3px solid var(--clay)', padding: '0.75rem 1rem', borderRadius: '4px', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div><strong>Trap:</strong> {currentQ.exam_trap}</div>
                  </div>
                )}
              </div>
            )}

            <button className="btn btn-primary w-full" onClick={handleNext} style={{ justifyContent: 'center' }}>
              Next Question →
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => setCurrentIndex(c => c - 1)} 
          disabled={currentIndex === 0}
        >
          ← Previous
        </button>

        {currentIndex === questions.length - 1 ? (
          <button className="btn btn-primary" onClick={handleFinish} disabled={loading}>
             {loading ? 'Saving...' : 'Finish Practice'}
          </button>
        ) : (
          <button 
            className="btn btn-ghost" 
            onClick={() => setCurrentIndex(c => c + 1)} 
            disabled={currentIndex === questions.length - 1}
          >
            Next Question →
          </button>
        )}
      </div>
    </div>
  );
}
