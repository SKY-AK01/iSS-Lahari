/**
 * lib/ai.ts — Unified AI client
 * Priority: Mistral (all keys) → Gemini (all keys)
 * All keys rotate round-robin; failed keys are skipped silently.
 */

// ── Key pools ───────────────────────────────────────────────────────
function getMistralKeys(): string[] {
  return [
    process.env.MISTRAL_API_KEY_1,
    process.env.MISTRAL_API_KEY_2,
    process.env.MISTRAL_API_KEY_3,
    process.env.MISTRAL_API_KEY_4,
    process.env.MISTRAL_API_KEY_5,
    process.env.MISTRAL_API_KEY_6,
  ].filter(Boolean) as string[];
}

function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    // Legacy key names (older env format)
    process.env.GEMINI_API_KEY1,
    process.env.GEMINI_API_KEY2,
    process.env.GEMINI_API_KEY3,
  ].filter(Boolean) as string[];
}

// ── Mistral call ────────────────────────────────────────────────────
async function callMistral(prompt: string, apiKey: string, maxTokens = 8192): Promise<string> {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Mistral ${res.status}: ${err}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Mistral returned empty response');
  return text;
}

// ── Gemini call ─────────────────────────────────────────────────────
async function callGemini(prompt: string, apiKey: string, maxTokens = 8192): Promise<string> {
  const model = 'gemini-2.5-flash-lite';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini ${res.status}: ${err}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

// ── Main exported function ──────────────────────────────────────────
/**
 * Generate text using AI. Tries Mistral keys first, then Gemini keys.
 * Returns the text response or throws if all providers fail.
 */
export async function generateText(
  prompt: string,
  options: { maxTokens?: number } = {}
): Promise<{ text: string; provider: 'mistral' | 'gemini' }> {
  const { maxTokens = 8192 } = options;
  const mistralKeys = getMistralKeys();
  const geminiKeys  = getGeminiKeys();

  // Try Mistral first
  for (const key of mistralKeys) {
    try {
      const text = await callMistral(prompt, key, maxTokens);
      return { text, provider: 'mistral' };
    } catch (e) {
      console.warn('[AI] Mistral key failed:', (e as Error).message);
    }
  }

  // Fallback to Gemini
  for (const key of geminiKeys) {
    try {
      const text = await callGemini(prompt, key, maxTokens);
      return { text, provider: 'gemini' };
    } catch (e) {
      console.warn('[AI] Gemini key failed:', (e as Error).message);
    }
  }

  throw new Error('All AI providers failed');
}

/**
 * Parse JSON from an AI response — strips markdown code fences if present.
 */
export function parseAIJson<T>(text: string): T {
  const clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  return JSON.parse(clean) as T;
}
