'use client';

import { useRouter } from 'next/navigation';
import { Brain, AlertTriangle } from 'lucide-react';
import QuestionText from '@/components/QuestionText';

interface Props {
  attempt: any;
}

export default function StudentResultsClient({ attempt }: Props) {
  const router = useRouter();
  
  const correctCount = attempt.attempt_answers.filter((a: any) => a.verdict === 'correct').length;
  const incorrectCount = attempt.attempt_answers.filter((a: any) => a.verdict === 'incorrect').length;
  const partialCount = attempt.attempt_answers.filter((a: any) => a.verdict === 'partial').length;
  const unansweredCount = attempt.attempt_answers.filter((a: any) => !a.verdict || a.verdict === 'unanswered').length;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '800px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/student')} style={{ marginBottom: '1.25rem' }}>
        ← Back to Tests
      </button>

      {/* Header */}
      <div className="animate-up" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Test Results</h1>
        <div style={{ fontSize: '0.95rem', color: 'var(--cream-dim)' }}>
          {attempt.batch.chapter.subject.name} › {attempt.batch.chapter.name}
        </div>
        
        {/* Score display */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <div className="score-ring">
            <span className="score-value">{attempt.percentage?.toFixed(1)}%</span>
            <span className="score-label">{attempt.score} / {attempt.max_score} pts</span>
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--sage)' }}>{correctCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)' }}>Correct</div>
          </div>
          <div style={{ width: '1px', background: 'var(--bg-4)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--partial)' }}>{partialCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)' }}>Partial</div>
          </div>
          <div style={{ width: '1px', background: 'var(--bg-4)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--clay)' }}>{incorrectCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)' }}>Incorrect</div>
          </div>
          <div style={{ width: '1px', background: 'var(--bg-4)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cream-dim)' }}>{unansweredCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)' }}>Skipped</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Detailed Review</h2>

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {attempt.attempt_answers.map((ans: any, i: number) => {
          const q = ans.question;
          const isCorrect = ans.verdict === 'correct';
          const isPartial = ans.verdict === 'partial';
          const vClass = isCorrect ? 'verdict-correct' : isPartial ? 'verdict-partial' : 'verdict-incorrect';

          return (
            <div key={i} className="card animate-up" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cream-dim)', minWidth: '2rem' }}>
                    Q{i + 1}
                  </span>
                  <span className={`pill pill-${q.difficulty}`}>{q.difficulty}</span>
                  {q.related && !Array.isArray(q.related) && q.related.exam_year && (
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '3px 8px', background: 'var(--ruby)', color: '#FFF', textTransform: 'uppercase' }}>
                      Year: {q.related.exam_year}
                    </span>
                  )}
                </div>
                
                <QuestionText text={q.question} style={{ marginBottom: '1.25rem', fontSize: '1rem' }} />

                <div className={vClass} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.8, marginBottom: '0.5rem' }}>
                    Your Answer
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '1rem' }}>
                    {ans.student_answer || <em>(Skipped)</em>}
                  </div>
                  
                  {ans.ai_feedback && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.5rem', borderTop: '1px dashed currentColor', paddingTop: '0.5rem' }}>
                      <strong>AI Note:</strong> {ans.ai_feedback}
                    </div>
                  )}
                </div>

                {!isCorrect && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--cream-dim)', marginBottom: '0.25rem' }}>
                      Correct Answer
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--sage)' }}>
                      {q.answer}
                    </div>
                  </div>
                )}

                {q.explanation && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ruby)', marginBottom: '0.35rem' }}>Explanation</div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--cream-dim)', lineHeight: 1.6, textTransform: 'none', fontWeight: 400 }}>{q.explanation}</p>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {(q.memory_trick || q.exam_trap) && (
                    <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {q.memory_trick && (
                        <div style={{ fontSize: '0.85rem', background: 'var(--sage-bg)', padding: '0.5rem 0.75rem', borderRadius: '4px', borderLeft: '3px solid var(--sage)', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <Brain size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div><strong>Trick:</strong> {q.memory_trick}</div>
                        </div>
                      )}
                      {q.exam_trap && (
                        <div style={{ fontSize: '0.85rem', background: 'var(--clay-bg)', padding: '0.5rem 0.75rem', borderRadius: '4px', borderLeft: '3px solid var(--clay)', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div><strong>Trap:</strong> {q.exam_trap}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {q.keywords && q.keywords.length > 0 && (
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', marginBottom: '0.25rem' }}>Keywords</div>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {q.keywords.map((k: string, idx: number) => (
                          <span key={idx} style={{ fontSize: '0.75rem', background: 'var(--bg-3)', padding: '2px 6px', borderRadius: '4px' }}>{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
