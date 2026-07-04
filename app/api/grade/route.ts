import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GradeRequest, GradeResponse } from '@/lib/types';

const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];

const KEYS = [
  process.env.GEMINI_API_KEY1,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
].filter(Boolean) as string[];

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth check — must be logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: GradeRequest = await req.json();

  const prompt = `You are an exam grader. Evaluate whether the student's answer is correct.

Question: ${body.question}
Correct answer: ${body.correctAnswer}
${body.explanation ? `Explanation/context: ${body.explanation}` : ''}
Student's answer: ${body.studentAnswer}

Rules:
- "correct" = the student has the right answer (exact or paraphrased clearly)
- "partial" = the student has part of the answer but is incomplete or slightly off
- "incorrect" = the answer is wrong or blank

Respond ONLY with valid JSON in this exact format:
{"verdict": "correct" | "partial" | "incorrect", "feedback": "one brief sentence of feedback"}`;

  async function callGemini(model: string, apiKey: string): Promise<GradeResponse> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as GradeResponse;
  }

  // Try each model, then for each model try all keys — mirrors the test script
  for (const model of MODELS) {
    for (const key of KEYS) {
      try {
        const result = await callGemini(model, key);
        return NextResponse.json(result);
      } catch {
        // try next key / model
      }
    }
  }

  // All models and keys failed — return graceful fallback
  const fallback: GradeResponse = {
    verdict: 'incorrect',
    feedback: 'Auto-grading unavailable. Please compare your answer to the correct answer and mark yourself.',
  };
  return NextResponse.json({ ...fallback, selfMark: true });
}
