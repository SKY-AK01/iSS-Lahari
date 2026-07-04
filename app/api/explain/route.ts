import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { question, answer, explanation } = body;

  if (!question || !answer) {
    return NextResponse.json({ error: 'Missing question or answer' }, { status: 400 });
  }

  const prompt = `You are a helpful exam tutor for Indian competitive exams (UPSC, SSC, etc.).
Explain this question and its correct answer clearly and concisely.
Provide: why the answer is correct, key concepts, and any useful memory tricks.

Question: ${question}
Correct Answer: ${answer}
${explanation ? `Given Explanation: ${explanation}` : ''}

Keep it under 200 words. Do not use markdown headers. Use plain paragraphs.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      explanation: `The correct answer is: ${answer}.\n\n${explanation || 'No additional explanation available.'}`
    });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error:', res.status, errText);
      // Return fallback instead of 500
      return NextResponse.json({
        explanation: explanation
          ? `${explanation}`
          : `The correct answer is: ${answer}.`,
        fallback: true,
      });
    }

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      return NextResponse.json({
        explanation: explanation || `The correct answer is: ${answer}.`,
        fallback: true,
      });
    }

    return NextResponse.json({ explanation: text });
  } catch (error: any) {
    console.error('Explain API Error:', error?.message);
    // Always return 200 with fallback content — never let the UI show an error
    return NextResponse.json({
      explanation: explanation
        ? `${explanation}`
        : `The correct answer is: ${answer}.`,
      fallback: true,
    });
  }
}
