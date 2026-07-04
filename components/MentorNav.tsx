'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ClipboardCheck } from 'lucide-react';

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
      "options": ["...", "...", "...", "..."],   // only for type "mcq"
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

export default function MentorNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const links = [
    { href: '/mentor', label: 'Dashboard' },
    { href: '/mentor/add-test', label: 'Add Test' },
    { href: '/mentor/results', label: 'Results' },
  ];

  return (
    <nav className="nav">
      <div className="nav-logo">
        <ClipboardCheck size={24} color="var(--ruby)" />
        <span>Lahari<span style={{ color: 'var(--ruby)' }}>.</span></span>
        <span style={{
          marginLeft: '0.75rem',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-heading)',
          padding: '3px 8px',
          background: '#000',
          color: '#FFF',
          fontWeight: 900,
          letterSpacing: '0.05em',
        }}>MENTOR</span>
      </div>

      <div className="nav-links">
        {links.map(l => (
          <button
            key={l.href}
            id={`nav-${l.label.toLowerCase().replace(' ', '-')}`}
            className={`nav-link ${pathname === l.href ? 'active' : ''}`}
            onClick={() => router.push(l.href)}
          >
            {l.label}
          </button>
        ))}
        <div style={{ width: '3px', height: '20px', background: '#000', margin: '0 0.25rem' }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--cream-dim)', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', padding: '0 0.5rem' }}>
          {name}
        </span>
        <button id="nav-logout" className="btn btn-ghost btn-sm" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

export { PROMPT_1, PROMPT_2, PROMPT_3 };
