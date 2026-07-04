import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { question, answer, explanation } = body;

  const prompt = `You are a helpful and encouraging tutor. 
Please explain the following exam question and its correct answer in a clear, easy-to-understand way.
Provide context, underlying concepts, and why the answer is correct.

Question: ${question}
Correct Answer: ${answer}
${explanation ? `Given Explanation: ${explanation}` : ''}

Format your response in Markdown. Do not include introductory phrases like "Here is an explanation", just get straight to the point.`;

  async function callGemini(): Promise<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No explanation generated.';
  }

  try {
    let result = await callGemini();
    return NextResponse.json({ explanation: result });
  } catch (error: any) {
    console.error('Explain API Error:', error);
    return NextResponse.json({ error: 'Failed to generate explanation.' }, { status: 500 });
  }
}
