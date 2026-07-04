'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Question, Verdict } from '@/lib/types';
import { Brain, AlertTriangle } from 'lucide-react';

interface Props {
  batch: any;
  questions: Question[];
  attemptId: string;
}

export default function PracticeClient({ batch, questions, attemptId }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<any[]>([]);
  const router = useRouter();

  const currentQ = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;

  async function handleMCQSubmit(option: string) {
    setStudentAnswer(option);
    const isCorrect = option === currentQ.answer;
    const v: Verdict = isCorrect ? 'correct' : 'incorrect';
    setVerdict(v);
    
    // Save locally
    setAnswers(prev => [...prev, {
      questionId: currentQ.id,
      studentAnswer: option,
      verdict: v,
      aiFeedback: null,
      marksAwarded: isCorrect ? 1 : 0
    }]);

    setIsFlipped(true);
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

      setVerdict(v);
      setAiFeedback(data.feedback);

      setAnswers(prev => [...prev, {
        questionId: currentQ.id,
        studentAnswer,
        verdict: v,
        aiFeedback: data.feedback,
        marksAwarded: v === 'correct' ? 1 : v === 'partial' ? 0.5 : 0
      }]);

      setIsFlipped(true);
    } catch (e) {
      console.error(e);
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    setStudentAnswer('');
    setIsFlipped(false);
    setVerdict(null);
    setAiFeedback(null);
    setCurrentIndex(prev => prev + 1);
  }

  async function handleFinish() {
    setLoading(true);
    // calculate score
    let correctCount = 0;
    answers.forEach(a => {
      if (a.verdict === 'correct') correctCount += 1;
      else if (a.verdict === 'partial') correctCount += 0.5;
    });
    const percentage = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

    await fetch('/api/attempts/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        answers,
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
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '720px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--cream-dim)' }}>
          {batch.chapter.subject.name} › {batch.chapter.name}
        </div>
        <div className="batch-badge">
          {currentIndex + 1} / {questions.length}
        </div>
      </div>

      <div className="study-card-wrap">
        <div className={`study-card-inner ${isFlipped ? 'flipped' : ''}`}>
          
          {/* FRONT (Question) */}
          <div className="study-card-face card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span className={`pill pill-${currentQ.difficulty}`}>{currentQ.difficulty}</span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-3)' }}>
                {currentQ.type.toUpperCase()}
              </span>
            </div>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              {currentQ.question}
            </h2>

            {currentQ.type === 'mcq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentQ.options?.map((opt, i) => (
                  <div
                    key={i}
                    className="omr-option"
                    onClick={() => handleMCQSubmit(opt)}
                  >
                    <div className="omr-bubble"><span>{String.fromCharCode(65 + i)}</span></div>
                    <span className="omr-option-text">{opt}</span>
                  </div>
                ))}
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
                <button
                  className="btn btn-primary"
                  onClick={handleShortAnswerSubmit}
                  disabled={loading || !studentAnswer.trim()}
                >
                  {loading ? 'Checking...' : 'Submit Answer'}
                </button>
              </div>
            )}
          </div>

          {/* BACK (Study Card) */}
          <div className="study-card-face study-card-back card-paper">
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: verdict === 'correct' ? 'var(--sage)' : verdict === 'partial' ? '#b89f5f' : 'var(--clay)', marginBottom: '0.5rem' }}>
                {verdict}
              </div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Answer:</h2>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{currentQ.answer}</p>
            </div>

            {aiFeedback && (
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <strong>AI Feedback:</strong> {aiFeedback}
              </div>
            )}

            {currentQ.explanation && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.4rem', color: 'var(--ruby)' }}>Explanation</h4>
                <p style={{ fontSize: '0.95rem' }}>{currentQ.explanation}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {currentQ.keywords && currentQ.keywords.length > 0 && (
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '0.4rem', color: 'rgba(20,20,20,0.6)' }}>Keywords</h4>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {currentQ.keywords.map((k, i) => <span key={i} style={{ fontSize: '0.8rem', background: 'rgba(20,20,20,0.08)', padding: '2px 8px', borderRadius: '4px' }}>{k}</span>)}
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
    </div>
  );
}
