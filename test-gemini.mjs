// test-gemini.mjs  — run with: node test-gemini.mjs YOUR_API_KEY
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: node test-gemini.mjs YOUR_API_KEY');
  process.exit(1);
}

console.log('Testing Gemini API key...');
console.log('Key starts with:', apiKey.slice(0, 6) + '...');

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say "Gemini API works!" and nothing else.' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 20 },
    }),
  }
);

const data = await res.json();

if (!res.ok) {
  console.error('\n❌ API ERROR:', res.status);
  console.error('Details:', JSON.stringify(data, null, 2));
} else {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('\n✅ SUCCESS! Gemini replied:', text);
}
