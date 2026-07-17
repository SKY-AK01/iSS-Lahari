/**
 * lib/ai.ts — Unified AI client
 *
 * Two modes:
 * 1. generateText()       — single call, tries all Mistral keys then all Gemini keys in order
 * 2. dispatchChunks()     — parallel dispatch: distributes N chunks across all available keys
 *                           simultaneously. Each key gets one chunk at a time. If a key fails,
 *                           that chunk is retried on the next available key. Tracks which
 *                           provider+key handled each chunk.
 */

// ── Key pools ───────────────────────────────────────────────────────
export function getMistralKeys(): string[] {
  return [
    process.env.MISTRAL_API_KEY_1,
    process.env.MISTRAL_API_KEY_2,
    process.env.MISTRAL_API_KEY_3,
    process.env.MISTRAL_API_KEY_4,
    process.env.MISTRAL_API_KEY_5,
    process.env.MISTRAL_API_KEY_6,
  ].filter(Boolean) as string[];
}

export function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    // Legacy key names
    process.env.GEMINI_API_KEY1,
    process.env.GEMINI_API_KEY2,
    process.env.GEMINI_API_KEY3,
  ].filter(Boolean) as string[];
}

// ── Provider key descriptor ─────────────────────────────────────────
export interface AIKey {
  provider: 'mistral' | 'gemini';
  key: string;
  /** human-readable label e.g. "mistral#2", "gemini#5" */
  label: string;
}

/** Returns all available keys across all providers, Mistral first */
export function getAllKeys(): AIKey[] {
  const keys: AIKey[] = [];
  getMistralKeys().forEach((k, i) => keys.push({ provider: 'mistral', key: k, label: `mistral#${i + 1}` }));
  getGeminiKeys().forEach((k, i)  => keys.push({ provider: 'gemini',  key: k, label: `gemini#${i + 1}` }));
  return keys;
}

// ── Per-provider call ───────────────────────────────────────────────
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

/** Call a specific AIKey — throws on failure */
export async function callKey(aiKey: AIKey, prompt: string, maxTokens = 8192): Promise<string> {
  if (aiKey.provider === 'mistral') return callMistral(prompt, aiKey.key, maxTokens);
  return callGemini(prompt, aiKey.key, maxTokens);
}

// ── Single-call generateText (unchanged behaviour) ──────────────────
/**
 * Tries all Mistral keys first, then all Gemini keys.
 * Returns on first success or throws if all fail.
 */
export async function generateText(
  prompt: string,
  options: { maxTokens?: number } = {}
): Promise<{ text: string; provider: 'mistral' | 'gemini'; keyLabel: string }> {
  const { maxTokens = 8192 } = options;

  for (const k of getAllKeys()) {
    try {
      const text = await callKey(k, prompt, maxTokens);
      return { text, provider: k.provider, keyLabel: k.label };
    } catch (e) {
      console.warn(`[AI] ${k.label} failed:`, (e as Error).message);
    }
  }

  throw new Error('All AI providers failed');
}

// ── Parallel chunk dispatcher ───────────────────────────────────────
export interface ChunkInput<T> {
  id: number;       // chunk identifier (matches AIChunkStatus.id)
  payload: T;       // whatever you want to pass — prompt string, data, etc.
}

export interface ChunkResult<T> {
  id: number;
  success: boolean;
  result?: string;          // AI text response on success
  error?: string;           // error message on failure
  keyLabel: string;         // which key handled this chunk e.g. "gemini#3"
  provider: 'mistral' | 'gemini' | 'none';
  attempts: string[];       // ordered list of keys tried for this chunk
  input: T;                 // original payload echoed back
}

/**
 * dispatchChunks — sends all pending chunks to available keys IN PARALLEL.
 *
 * Strategy:
 * - Available keys are treated as a pool (queue).
 * - Each key gets one chunk at a time (no key handles two chunks simultaneously).
 * - When a key finishes (success or fail), it picks the next pending chunk.
 * - On failure, the chunk is re-queued and the next available key picks it up.
 * - If a chunk exhausts all keys, it is marked as permanently failed.
 * - Returns all results (success + failed) — caller decides what to do.
 */
export async function dispatchChunks<T>(
  chunks: ChunkInput<T>[],
  buildPrompt: (chunk: ChunkInput<T>) => string,
  options: { maxTokens?: number } = {}
): Promise<ChunkResult<T>[]> {
  const { maxTokens = 2048 } = options;
  const allKeys = getAllKeys();

  if (allKeys.length === 0) {
    return chunks.map(c => ({
      id: c.id, success: false, error: 'No API keys configured',
      keyLabel: 'none', provider: 'none' as const, attempts: [], input: c.payload,
    }));
  }

  // Result map: chunkId → result
  const results = new Map<number, ChunkResult<T>>();

  // Queue of chunks still needing processing
  // Each entry also carries the list of keys already tried (to avoid infinite retry on same key)
  const queue: Array<{ chunk: ChunkInput<T>; triedKeys: Set<string> }> =
    chunks.map(c => ({ chunk: c, triedKeys: new Set<string>() }));

  // Mutex-free queue drain using a shared index + Promise.all per "wave"
  // Each wave assigns one chunk per available key and runs them in parallel.
  // We repeat waves until the queue is empty.
  while (queue.length > 0) {
    // Build assignments for this wave: pair each available key with the next chunk it hasn't tried
    const wave: Array<{ key: AIKey; entry: typeof queue[0] }> = [];
    const usedChunkIndices = new Set<number>();

    for (const key of allKeys) {
      // Find the first queued chunk this key hasn't tried yet
      const entryIdx = queue.findIndex(
        (e, i) => !usedChunkIndices.has(i) && !e.triedKeys.has(key.label)
      );
      if (entryIdx === -1) continue; // this key has tried every remaining chunk
      usedChunkIndices.add(entryIdx);
      wave.push({ key, entry: queue[entryIdx] });
    }

    if (wave.length === 0) {
      // Every remaining chunk has been tried by every key — mark them all failed
      for (const { chunk, triedKeys } of queue) {
        results.set(chunk.id, {
          id: chunk.id, success: false,
          error: `Exhausted all ${allKeys.length} keys`,
          keyLabel: 'none', provider: 'none',
          attempts: Array.from(triedKeys),
          input: chunk.payload,
        });
      }
      break;
    }

    // Run this wave in parallel
    const waveResults = await Promise.allSettled(
      wave.map(async ({ key, entry }) => {
        entry.triedKeys.add(key.label);
        const prompt = buildPrompt(entry.chunk);
        const text = await callKey(key, prompt, maxTokens);
        return { entry, key, text };
      })
    );

    // Process wave results — build final results and re-queue failures
    const succeededChunks = new Set<number>();

    for (let wi = 0; wi < waveResults.length; wi++) {
      const settled = waveResults[wi];
      const { key, entry } = wave[wi]; // 1-to-1 index match with Promise.allSettled

      if (settled.status === 'fulfilled') {
        succeededChunks.add(entry.chunk.id);
        results.set(entry.chunk.id, {
          id: entry.chunk.id, success: true, result: settled.value.text,
          keyLabel: key.label, provider: key.provider,
          attempts: Array.from(entry.triedKeys),
          input: entry.chunk.payload,
        });
        console.log(`[dispatchChunks] chunk ${entry.chunk.id} ✓ via ${key.label}`);
      } else {
        console.warn(`[dispatchChunks] chunk ${entry.chunk.id} ✗ via ${key.label}:`, settled.reason);
        // entry stays in queue with this key now in triedKeys — will retry with a different key
      }
    }

    // Remove succeeded chunks from queue (mutate in place, back-to-front)
    for (let i = queue.length - 1; i >= 0; i--) {
      if (succeededChunks.has(queue[i].chunk.id)) {
        queue.splice(i, 1);
      }
    }
  }

  return chunks.map(c => results.get(c.id)!);
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

