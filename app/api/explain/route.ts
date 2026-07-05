import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];

const KEYS = [
  process.env.GEMINI_API_KEY1,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
].filter(Boolean) as string[];

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { question, answer, explanation, studentAnswer } = body;

  if (!question || !answer) {
    return NextResponse.json({ error: 'Missing question or answer' }, { status: 400 });
  }

  const prompt = `You are a helpful and highly encouraging exam tutor for Indian competitive exams (UPSC, SSC, etc.).
Explain this question and its concepts in very simple, easy-to-understand words. Go in-depth but keep it accessible.

Question: ${question}
Correct Answer: ${answer}
Student's Selected Answer: ${studentAnswer || 'None'}
${explanation ? `Existing Explanation Context: ${explanation}` : ''}

Instructions:
1. If the student selected the wrong answer, start by kindly explaining WHY their selected option is incorrect, pointing out the misconception.
2. If they got it right, congratulate them and reinforce why it's right.
3. Then, explain the correct answer in depth using simple words. Break down the core concepts so they truly understand the "why".
4. Provide any useful memory tricks or analogies if relevant.

Do not use markdown headers (e.g., no # or ##). Use simple paragraphs, bullet points, and bold text for emphasis.`;

  async function callGemini(model: string, apiKey: string): Promise<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  // Try each model, then for each model try all keys — mirrors the test script
  for (const model of MODELS) {
    for (const key of KEYS) {
      try {
        const text = await callGemini(model, key);
        if (text) return NextResponse.json({ explanation: text });
      } catch {
        // try next key / model
      }
    }
  }

  // All models and keys failed — return graceful fallback
  return NextResponse.json({
    explanation: explanation
      ? `${explanation}`
      : `The correct answer is: ${answer}.`,
    fallback: true,
  });
}
