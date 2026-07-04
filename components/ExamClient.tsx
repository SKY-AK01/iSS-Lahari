'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Question } from '@/lib/types';
import { Flag } from 'lucide-react';
import QuestionText from '@/components/QuestionText';

interface Props {
  batch: any;
  questions: Question[];
  attemptId: string;
  durationMinutes: number;
}

export default function ExamClient({ batch, questions, attemptId, durationMinutes }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const router = useRouter();

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const currentQ = questions[currentIndex];
  
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timerPercent = (timeLeft / (durationMinutes * 60)) * 100;
  const isWarning = timerPercent < 20;
  const isCritical = timerPercent < 5;

  function handleOptionSelect(opt: string) {
    setAnswers(prev => ({ ...prev, [currentQ.id]: opt }));
  }

  function toggleFlag() {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) next.delete(currentQ.id);
      else next.add(currentQ.id);
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    
    // Call server to grade all short answers + calculate score
    // In a real app we'd do grading in a bulk API, but for simplicity here we map and submit
    const gradingPromises = questions.map(async q => {
      const ans = answers[q.id] || '';
      if (!ans) return { questionId: q.id, studentAnswer: ans, verdict: 'unanswered', aiFeedback: null, marksAwarded: 0 };
      
      if (q.type === 'mcq') {
        const isCorrect = ans === q.answer;
        // The server route /api/attempts/submit will recalculate marks properly if we don't, 
        // but let's just let the server trust us for now or we could move grading fully to server.
        return {
          questionId: q.id,
          studentAnswer: ans,
          verdict: isCorrect ? 'correct' : 'incorrect',
          aiFeedback: null,
          // marks Awarded will be computed server side or here. 
          // (To keep it simple, we don't pass marks, server can calculate if needed, or we just pass score)
        };
      } else {
        // short answer grading
        try {
          const res = await fetch('/api/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: q.question,
              correctAnswer: q.answer,
              explanation: q.explanation,
              studentAnswer: ans,
            }),
          });
          const data = await res.json();
          return {
            questionId: q.id,
            studentAnswer: ans,
            verdict: data.verdict,
            aiFeedback: data.feedback,
          };
        } catch {
          return { questionId: q.id, studentAnswer: ans, verdict: 'incorrect', aiFeedback: 'Grading failed' };
        }
      }
    });

    const gradedAnswers = await Promise.all(gradingPromises);

    // Get attempt marking scheme (fetch attempt details if we didn't pass it, assuming default for demo)
    let score = 0;
    gradedAnswers.forEach(ga => {
      if (ga.verdict === 'correct') score += 2;
      else if (ga.verdict === 'incorrect' && ga.studentAnswer) score -= 0.5;
      else if (ga.verdict === 'partial') score += 1;
    });

    const maxScore = questions.length * 2;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    await fetch('/api/attempts/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        answers: gradedAnswers,
        score,
        percentage,
      }),
    });

    router.push(`/student/results/${attemptId}`);
  }

  if (showReview) {
    return (
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Review Answers</h2>
        
        <div className="q-palette" style={{ marginBottom: '2rem' }}>
          {questions.map((q, i) => {
            const ans = answers[q.id];
            const isFlagged = flagged.has(q.id);
            return (
              <button
                key={q.id}
                className={`q-palette-btn ${ans ? 'answered' : ''} ${isFlagged ? 'flagged' : ''}`}
                onClick={() => { setCurrentIndex(i); setShowReview(false); }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => setShowReview(false)} disabled={submitting}>
            Back to Exam
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ flex: 1, justifyContent: 'center' }}>
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Bar with Timer */}
      <div style={{ background: 'var(--bg-2)', padding: '0.75rem 1rem', borderBottom: 'var(--border-thick)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {batch.chapter.subject.name} › {batch.chapter.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div className="timer-bar-wrap" style={{ width: '80px' }}>
            <div className={`timer-bar-fill ${isCritical ? 'critical' : isWarning ? 'warning' : ''}`} style={{ width: `${timerPercent}%` }} />
          </div>
          <div className={`timer-display ${isCritical ? 'critical' : isWarning ? 'warning' : ''}`} style={{ minWidth: '52px', textAlign: 'right' }}>
            {formatTime(timeLeft)}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowReview(true)} style={{ whiteSpace: 'nowrap' }}>
            Submit
          </button>
        </div>
      </div>

      <div className="container flex-col" style={{ flex: 1, paddingTop: '1.5rem', paddingBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--cream-dim)' }}>
              Q {currentIndex + 1} / {questions.length}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={toggleFlag}
              style={{ color: flagged.has(currentQ.id) ? 'var(--ruby)' : '', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Flag size={14} fill={flagged.has(currentQ.id) ? 'currentColor' : 'none'} />
              {flagged.has(currentQ.id) ? 'Flagged' : 'Flag'}
            </button>
          </div>

          <QuestionText text={currentQ.question} style={{ marginBottom: '1.75rem' }} />

          <div style={{ flex: 1 }}>
            {currentQ.type === 'mcq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentQ.options?.map((opt, i) => (
                  <div
                    key={i}
                    className={`omr-option ${answers[currentQ.id] === opt ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(opt)}
                  >
                    <div className="omr-bubble"><span>{String.fromCharCode(65 + i)}</span></div>
                    <span className="omr-option-text">{opt}</span>
                  </div>
                ))}
              </div>
            )}

            {currentQ.type === 'short' && (
              <textarea
                className="input"
                placeholder="Type your answer here..."
                value={answers[currentQ.id] || ''}
                onChange={e => handleOptionSelect(e.target.value)}
                style={{ minHeight: '160px' }}
              />
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex === questions.length - 1}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
