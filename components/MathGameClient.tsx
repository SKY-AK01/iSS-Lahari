'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Trophy, RotateCcw, ArrowLeft, Lightbulb, X, Divide, Brain } from 'lucide-react';

// ── Math Tricks ────────────────────────────────────────────
const TRICKS = [
  {
    title: 'Multiply any number by 11',
    rule: 'Add adjacent digits and place the sum in between. For 2-digit numbers: split the digits, sum them, and sandwich.',
    examples: ['23 × 11 → 2_(2+3)_3 → 253', '45 × 11 → 4_(4+5)_5 → 495', '37 × 11 → 3_(3+7)_7 → carry: 407'],
  },
  {
    title: 'Square numbers ending in 5',
    rule: 'Multiply the tens digit by (tens digit + 1), then append 25.',
    examples: ['35² → 3×4 = 12 → 1225', '75² → 7×8 = 56 → 5625', '65² → 6×7 = 42 → 4225'],
  },
  {
    title: 'Subtract from 1000',
    rule: 'Subtract all digits from 9 except the last, subtract the last from 10.',
    examples: ['1000 − 347 → (9−3)(9−4)(10−7) = 653', '1000 − 286 → (9−2)(9−8)(10−6) = 714'],
  },
  {
    title: 'Multiply by 5 quickly',
    rule: 'Divide by 2, then multiply by 10. Or: halve the number and add a zero.',
    examples: ['68 × 5 → 68÷2=34 → 340', '126 × 5 → 126÷2=63 → 630', '247 × 5 → 247÷2=123.5 → 1235'],
  },
  {
    title: 'Multiply by 9',
    rule: 'Multiply by 10 then subtract the original number.',
    examples: ['47 × 9 → 47×10=470 → 470−47=423', '83 × 9 → 830−83=747'],
  },
  {
    title: 'Quick percentage trick',
    rule: 'x% of y = y% of x. Always pick the easier calculation.',
    examples: ['8% of 25 = 25% of 8 = 2', '4% of 75 = 75% of 4 = 3', '12% of 50 = 50% of 12 = 6'],
  },
  {
    title: 'Add large numbers fast',
    rule: 'Round up to nearest 10/100, add, then subtract the rounding amount.',
    examples: ['67+98 → 67+100−2=165', '245+198 → 245+200−2=443'],
  },
  {
    title: 'Divide by 5 quickly',
    rule: 'Multiply by 2, then divide by 10 (move decimal one place left).',
    examples: ['80÷5 → 80×2=160 → 16', '345÷5 → 345×2=690 → 69', '235÷5 → 470 → 47'],
  },
  {
    title: 'Divide by 4 quickly',
    rule: 'Halve the number, then halve again.',
    examples: ['96÷4 → 48÷2 → 24', '212÷4 → 106÷2 → 53', '348÷4 → 174÷2 → 87'],
  },
  {
    title: 'Divide by 8 quickly',
    rule: 'Halve three times in a row.',
    examples: ['160÷8 → 80 → 40 → 20', '256÷8 → 128 → 64 → 32'],
  },
  {
    title: 'Divide by 25',
    rule: 'Multiply by 4, then divide by 100.',
    examples: ['75÷25 → 75×4=300 → 3', '350÷25 → 350×4=1400 → 14'],
  },
  {
    title: 'Check divisibility by 9',
    rule: 'Add all the digits. If the sum is divisible by 9, so is the original number.',
    examples: ['729 → 7+2+9=18 → divisible by 9 ✓', '543 → 5+4+3=12 → not divisible by 9'],
  },
];

// ── Types ──────────────────────────────────────────────────
type Difficulty = 'easy' | 'medium' | 'hard';
type Op = '+' | '−' | '×' | '÷';
type GameMode = 'drill' | 'divide' | 'brainstorm';

interface Question { a: number; b: number; op: Op; answer: number; display: string; }

interface BrainStormQ {
  chain: string[];   // e.g. ["Start: 40", "÷ 4", "× 3", "− 5"]
  answer: number;
  steps: string;     // full display for hint
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Speed Drill generator ──────────────────────────────────
function generateDrillQuestion(difficulty: Difficulty): Question {
  const opWeights: Op[] = difficulty === 'easy'
    ? ['+', '+', '+', '−', '−']
    : difficulty === 'medium'
    ? ['+', '−', '×', '×', '+']
    : ['+', '−', '×', '÷', '×', '÷'];

  const op = opWeights[Math.floor(Math.random() * opWeights.length)];
  let a = 0, b = 0, answer = 0;

  if (op === '+') {
    const range = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 100 : 500;
    a = randInt(1, range); b = randInt(1, range); answer = a + b;
  } else if (op === '−') {
    const range = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 100 : 500;
    a = randInt(5, range); b = randInt(1, a); answer = a - b;
  } else if (op === '×') {
    a = difficulty === 'medium' ? randInt(2, 12) : randInt(2, 25);
    b = difficulty === 'medium' ? randInt(2, 12) : randInt(2, 25);
    answer = a * b;
  } else {
    b = difficulty === 'medium' ? randInt(2, 12) : randInt(2, 20);
    answer = difficulty === 'medium' ? randInt(2, 12) : randInt(2, 20);
    a = b * answer;
  }
  return { a, b, op, answer, display: `${a} ${op} ${b}` };
}

// ── Divide Quickly generator ───────────────────────────────
function generateDivideQuestion(difficulty: Difficulty): Question {
  type DivSpec = { divisor: number; quotientMax: number };
  const specs: Record<Difficulty, DivSpec[]> = {
    easy:   [{ divisor: 2, quotientMax: 20 }, { divisor: 4, quotientMax: 15 }, { divisor: 5, quotientMax: 20 }],
    medium: [{ divisor: 3, quotientMax: 25 }, { divisor: 6, quotientMax: 20 }, { divisor: 8, quotientMax: 15 }, { divisor: 9, quotientMax: 12 }, { divisor: 25, quotientMax: 20 }],
    hard:   [{ divisor: 7, quotientMax: 20 }, { divisor: 11, quotientMax: 20 }, { divisor: 12, quotientMax: 15 }, { divisor: 15, quotientMax: 12 }, { divisor: 25, quotientMax: 20 }],
  };
  const spec = specs[difficulty][Math.floor(Math.random() * specs[difficulty].length)];
  const answer = randInt(2, spec.quotientMax);
  const a = spec.divisor * answer;
  return { a, b: spec.divisor, op: '÷', answer, display: `${a} ÷ ${spec.divisor}` };
}

// ── Brain Storm generator ──────────────────────────────────
function generateBrainStormQuestion(difficulty: Difficulty): BrainStormQ {
  const stepCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
  const ops: Op[] = difficulty === 'easy' ? ['+', '−'] : difficulty === 'medium' ? ['+', '−', '×'] : ['+', '−', '×', '÷'];

  let value = randInt(10, 50);
  const chain: string[] = [`Start: ${value}`];
  const stepStrings: string[] = [`${value}`];

  for (let i = 0; i < stepCount; i++) {
    const op = ops[Math.floor(Math.random() * ops.length)];
    let operand = 0;

    if (op === '+') {
      operand = randInt(1, difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 50);
      value += operand;
    } else if (op === '−') {
      operand = randInt(1, Math.min(value - 1, difficulty === 'easy' ? 10 : 20));
      if (operand < 1) operand = 1;
      value -= operand;
    } else if (op === '×') {
      operand = randInt(2, difficulty === 'medium' ? 5 : 9);
      value *= operand;
    } else {
      // pick a divisor that divides evenly
      const divisors = [2, 3, 4, 5].filter(d => value % d === 0 && value / d > 0);
      if (divisors.length === 0) { operand = 1; } // fallback: no-op div by 1 not visible
      else { operand = divisors[Math.floor(Math.random() * divisors.length)]; value = value / operand; }
    }

    if (op !== '÷' || operand > 1) {
      chain.push(`${op} ${operand}`);
      stepStrings.push(`${op === '+' ? '+' : op === '−' ? '−' : op === '×' ? '×' : '÷'}${operand}`);
    } else {
      // reuse + as fallback if no clean divisor found
      operand = randInt(1, 10);
      value += operand;
      chain.push(`+ ${operand}`);
      stepStrings.push(`+${operand}`);
    }
  }

  const steps = chain.join('  →  ');
  return { chain, answer: value, steps };
}

const GAME_DURATION = 60;
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy (+ and −)',
  medium: 'Medium (+ − ×)',
  hard: 'Hard (all ops)',
};
const MODE_INFO: Record<GameMode, { label: string; subtitle: string; icon: React.ReactNode }> = {
  drill:      { label: 'Speed Drill',     subtitle: '60s — all operations',         icon: <Zap size={18} /> },
  divide:     { label: 'Divide Quickly',  subtitle: '60s — pure division focus',    icon: <Divide size={18} /> },
  brainstorm: { label: 'Brain Storm',     subtitle: '60s — multi-step chains',      icon: <Brain size={18} /> },
};

// ── Main Component ─────────────────────────────────────────
export default function MathGameClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [screen, setScreen] = useState<'menu' | 'game' | 'result' | 'tricks'>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameMode, setGameMode] = useState<GameMode>('drill');

  // Game state
  const [drillQuestion, setDrillQuestion] = useState<Question | null>(null);
  const [brainQuestion, setBrainQuestion] = useState<BrainStormQ | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [activeTrick, setActiveTrick] = useState<number | null>(null);

  const nextQuestion = useCallback(() => {
    setUserAnswer('');
    setFeedback(null);
    setShowHint(false);
    if (gameMode === 'drill') setDrillQuestion(generateDrillQuestion(difficulty));
    else if (gameMode === 'divide') setDrillQuestion(generateDivideQuestion(difficulty));
    else setBrainQuestion(generateBrainStormQuestion(difficulty));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [difficulty, gameMode]);

  // Timer
  useEffect(() => {
    if (screen !== 'game') return;
    if (timeLeft <= 0) { setScreen('result'); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, timeLeft]);

  function startGame() {
    setScore(0); setStreak(0); setBestStreak(0); setTotal(0);
    setTimeLeft(GAME_DURATION);
    setScreen('game');
    setFeedback(null);
    setShowHint(false);
    if (gameMode === 'drill') {
      const q = generateDrillQuestion(difficulty);
      setDrillQuestion(q);
      setBrainQuestion(null);
    } else if (gameMode === 'divide') {
      const q = generateDivideQuestion(difficulty);
      setDrillQuestion(q);
      setBrainQuestion(null);
    } else {
      const q = generateBrainStormQuestion(difficulty);
      setBrainQuestion(q);
      setDrillQuestion(null);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleSubmit() {
    const currentAnswer = gameMode === 'brainstorm' ? brainQuestion?.answer : drillQuestion?.answer;
    if (currentAnswer === undefined || userAnswer.trim() === '') return;
    const num = parseInt(userAnswer.trim(), 10);
    const isCorrect = num === currentAnswer;
    setTotal(t => t + 1);
    if (isCorrect) {
      const newStreak = streak + 1;
      setScore(s => s + (newStreak >= 3 ? 2 : 1));
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setFeedback('correct');
    } else {
      setStreak(0);
      setFeedback('wrong');
    }
    setTimeout(nextQuestion, 400);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const timerPct = (timeLeft / GAME_DURATION) * 100;
  const timerColor = timeLeft > 20 ? 'var(--ruby)' : timeLeft > 10 ? '#FF6B00' : '#FF0000';

  // ── Tricks screen ──────────────────────────────────────
  if (screen === 'tricks') {
    return (
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '760px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setActiveTrick(null); setScreen('menu'); }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
            Math Tricks
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {TRICKS.map((trick, i) => (
            <div key={i} style={{ border: 'var(--border-thick)', boxShadow: 'var(--shadow-btn)', background: 'var(--bg-3)', overflow: 'hidden' }}>
              <button
                onClick={() => setActiveTrick(activeTrick === i ? null : i)}
                style={{ width: '100%', padding: '1.1rem 1.25rem', background: activeTrick === i ? 'var(--ruby)' : 'var(--bg-3)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', transition: 'background 150ms' }}
              >
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '-0.01em', color: activeTrick === i ? '#FFF' : 'var(--ink)' }}>
                  {trick.title}
                </span>
                <X size={16} style={{ transform: activeTrick === i ? 'rotate(0deg)' : 'rotate(45deg)', transition: 'transform 200ms', color: activeTrick === i ? '#FFF' : 'var(--ink)', flexShrink: 0 }} />
              </button>
              {activeTrick === i && (
                <div className="animate-in" style={{ padding: '1.25rem', borderTop: 'var(--border-thick)', background: '#FFF' }}>
                  <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--ink)', fontWeight: 500, textTransform: 'none', marginBottom: '1rem' }}>{trick.rule}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {trick.examples.map((ex, j) => (
                      <div key={j} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, padding: '0.6rem 1rem', background: 'var(--sage-bg)', border: '2px solid var(--ruby)', color: 'var(--ink)' }}>{ex}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Result screen ──────────────────────────────────────
  if (screen === 'result') {
    const grade = score >= 30 ? '🏆 Excellent!' : score >= 20 ? '🎯 Good Job!' : score >= 10 ? '📈 Keep Going!' : '💪 Practice More!';
    return (
      <div className="container animate-up" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '560px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(2rem, 6vw, 4rem)', textTransform: 'uppercase', letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Time&apos;s Up!</div>
        <div style={{ fontSize: '0.8rem', marginBottom: '0.35rem', color: 'var(--ruby)', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {MODE_INFO[gameMode].label}
        </div>
        <div style={{ fontSize: '1.3rem', marginBottom: '2rem', color: 'var(--cream-dim)', textTransform: 'none', fontWeight: 500 }}>{grade}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
          {[
            { label: 'Score', value: score, highlight: true },
            { label: 'Questions', value: total, highlight: false },
            { label: 'Best Streak', value: bestStreak, highlight: false },
            { label: 'Accuracy', value: `${accuracy}%`, highlight: false },
          ].map(s => (
            <div key={s.label} style={{ border: 'var(--border-thick)', boxShadow: 'var(--shadow-hard)', background: s.highlight ? 'var(--ruby)' : 'var(--bg-3)', padding: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '2.2rem', lineHeight: 1, color: s.highlight ? '#FFF' : 'var(--ink)', marginBottom: '0.3rem' }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: s.highlight ? 'rgba(255,255,255,0.7)' : 'var(--cream-dim)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        {bestStreak >= 3 && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--clay-bg)', border: '2px solid var(--clay)', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            ⚡ You got a x2 bonus for streaks of 3+!
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={startGame} style={{ gap: '0.5rem' }}><RotateCcw size={16} /> Play Again</button>
          <button className="btn btn-ghost" onClick={() => setScreen('menu')}>Change Mode</button>
          <button className="btn btn-ghost" onClick={() => router.push('/student')}><ArrowLeft size={16} /> Dashboard</button>
        </div>
      </div>
    );
  }

  // ── Game screen ────────────────────────────────────────
  if (screen === 'game') {
    const isBrain = gameMode === 'brainstorm';
    const currentBrain = brainQuestion;
    const currentDrill = drillQuestion;
    if (!isBrain && !currentDrill) return null;
    if (isBrain && !currentBrain) return null;

    return (
      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: '560px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setScreen('result')}><ArrowLeft size={14} /> End</button>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {streak >= 3 && (
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--ruby)', background: 'var(--ruby-subtle)', padding: '2px 8px', border: '2px solid var(--ruby)' }}>
                ⚡ x2 Streak!
              </span>
            )}
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1rem' }}>
              Score: <span style={{ color: 'var(--ruby)' }}>{score}</span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div style={{ height: '8px', background: '#E0E0E0', border: 'var(--border-thick)', overflow: 'hidden', marginBottom: '0.5rem' }}>
          <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 1s ease' }} />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.9rem', textAlign: 'right', marginBottom: '2rem', color: timeLeft <= 10 ? 'var(--ruby)' : 'var(--ink)' }}>
          {timeLeft}s
        </div>

        {/* Question card */}
        <div style={{
          border: 'var(--border-thick)', boxShadow: 'var(--shadow-hard)', padding: '2.5rem 2rem', textAlign: 'center',
          marginBottom: '1.5rem', background: feedback === 'correct' ? 'var(--sage-bg)' : feedback === 'wrong' ? 'var(--ruby-subtle)' : 'var(--bg-3)',
          transition: 'background 200ms', minHeight: isBrain ? '220px' : '180px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
        }}>
          {isBrain && currentBrain ? (
            <>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.45, marginBottom: '0.25rem' }}>
                Follow the chain
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                {currentBrain.chain.map((step, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 'clamp(1rem, 3.5vw, 1.5rem)', color: i === 0 ? 'var(--ink)' : 'var(--ruby)', padding: '0.3rem 0.6rem', border: i === 0 ? '2px solid var(--ink)' : '2px solid var(--ruby)', background: i === 0 ? 'var(--bg-3)' : 'transparent' }}>
                      {step}
                    </span>
                    {i < currentBrain.chain.length - 1 && <span style={{ color: 'var(--cream-dim)', fontSize: '1rem' }}>→</span>}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.4, marginTop: '0.25rem' }}>= ?</div>
              {showHint && (
                <div className="animate-in" style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ruby)', marginTop: '0.4rem', opacity: 0.75 }}>
                  {currentBrain.steps}
                </div>
              )}
            </>
          ) : currentDrill ? (
            <>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--ink)' }}>
                {currentDrill.display}
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.4 }}>= ?</div>
            </>
          ) : null}
        </div>

        {/* Answer input */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            ref={inputRef} type="number" className="input"
            style={{ flex: 1, textAlign: 'center', fontSize: '1.5rem', fontFamily: 'var(--font-mono)', fontWeight: 900, padding: '1rem' }}
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            onKeyDown={handleKey}
            placeholder="?" autoComplete="off"
          />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={userAnswer.trim() === ''} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            ✓
          </button>
        </div>

        {/* Hint button for Brain Storm */}
        {isBrain && (
          <div style={{ marginTop: '0.6rem', textAlign: 'right' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowHint(h => !h)} style={{ fontSize: '0.75rem', opacity: 0.65 }}>
              {showHint ? 'Hide hint' : '💡 Show hint'}
            </button>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="animate-in" style={{ marginTop: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center', padding: '0.5rem', color: feedback === 'correct' ? 'var(--ruby)' : '#FFF', background: feedback === 'correct' ? 'var(--sage-bg)' : 'var(--ruby)', border: '2px solid var(--ruby)' }}>
            {feedback === 'correct' ? (streak >= 3 ? `✓ Correct! +2 (Streak x${streak})` : '✓ Correct!') : '✗ Wrong!'}
          </div>
        )}

        {/* Streak counter */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--cream-dim)' }}>
          <span>Answered: {total}</span>
          <span>Streak: {streak} 🔥</span>
        </div>
      </div>
    );
  }

  // ── Menu screen ────────────────────────────────────────
  return (
    <div className="container animate-up" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '640px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/student')} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Dashboard
      </button>

      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(2rem, 6vw, 4rem)', textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '0.5rem' }}>
        Math<br /><span style={{ color: 'var(--ruby)' }}>Brain Gym</span>
      </div>
      <p style={{ fontSize: '0.92rem', lineHeight: 1.6, textTransform: 'none', marginBottom: '2rem' }}>
        60 seconds. Pick a mode and sharpen your mental math. Get streaks of 3+ for double points!
      </p>

      {/* Game Mode */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cream-dim)', marginBottom: '0.75rem' }}>
          Choose Mode
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(['drill', 'divide', 'brainstorm'] as GameMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setGameMode(mode)}
              style={{
                padding: '1rem 1.25rem', border: 'var(--border-thick)',
                boxShadow: gameMode === mode ? '4px 4px 0 0 var(--ruby)' : 'var(--shadow-btn)',
                background: gameMode === mode ? 'var(--ruby)' : 'var(--bg-3)',
                color: gameMode === mode ? '#FFF' : 'var(--ink)',
                cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.95rem',
                textTransform: 'uppercase', textAlign: 'left', transition: 'all 100ms',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {MODE_INFO[mode].icon}
                {MODE_INFO[mode].label}
              </span>
              <span style={{ fontSize: '0.72rem', opacity: 0.75, fontWeight: 700 }}>{MODE_INFO[mode].subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cream-dim)', marginBottom: '0.75rem' }}>
          Choose Difficulty
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              style={{
                padding: '0.65rem 1.25rem', border: 'var(--border-thick)', flex: 1, minWidth: '90px',
                boxShadow: difficulty === d ? '4px 4px 0 0 var(--ruby)' : 'var(--shadow-btn)',
                background: difficulty === d ? 'var(--ruby)' : 'var(--bg-3)',
                color: difficulty === d ? '#FFF' : 'var(--ink)', cursor: 'pointer',
                fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.88rem',
                textTransform: 'uppercase', transition: 'all 100ms', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: '2px',
              }}
            >
              <span>{d}</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: 700 }}>{DIFFICULTY_LABELS[d]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode description card */}
      <div style={{ padding: '1rem 1.25rem', border: 'var(--border-thick)', background: 'var(--bg-3)', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem', color: 'var(--cream-dim)' }}>
          {gameMode === 'drill' ? 'Speed Drill — Scoring' : gameMode === 'divide' ? 'Divide Quickly — Scoring' : 'Brain Storm — Scoring'}
        </div>
        {gameMode === 'drill' && <>
          <div style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'none', marginBottom: '0.25rem' }}>✓ Correct answer → +1 point</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'none', marginBottom: '0.25rem' }}>⚡ 3+ streak → +2 points per correct answer</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'none' }}>✗ Wrong answer → streak resets to 0</div>
        </>}
        {gameMode === 'divide' && <>
          <div style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'none', marginBottom: '0.25rem' }}>÷ Pure division questions — no guessing</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'none', marginBottom: '0.25rem' }}>✓ Correct → +1 (or +2 on streak of 3+)</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'none' }}>💡 Check Math Tricks for fast division shortcuts</div>
        </>}
        {gameMode === 'brainstorm' && <>
          <div style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'none', marginBottom: '0.25rem' }}>🧠 Multi-step chain: Start → op1 → op2 → … = ?</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'none', marginBottom: '0.25rem' }}>✓ Correct → +1 (or +2 on streak of 3+)</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'none' }}>💡 Use the hint button if you get stuck (no penalty)</div>
        </>}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={startGame} style={{ flex: 1, justifyContent: 'center', gap: '0.5rem', padding: '1.25rem', fontSize: '1.1rem', minWidth: '160px' }}>
          <Zap size={20} /> Start {MODE_INFO[gameMode].label}
        </button>
        <button className="btn btn-ghost" onClick={() => setScreen('tricks')} style={{ gap: '0.5rem' }}>
          <Lightbulb size={18} /> Math Tricks
        </button>
      </div>
    </div>
  );
}
