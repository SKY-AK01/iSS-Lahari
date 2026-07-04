import "dotenv/config";

const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

const KEYS = [
  { name: "KEY 1", value: process.env.GEMINI_API_KEY1 },
  { name: "KEY 2", value: process.env.GEMINI_API_KEY2 },
  { name: "KEY 3", value: process.env.GEMINI_API_KEY3 },
];

const PROMPT = "Reply with exactly: Working";

async function test(model, key) {
  const start = Date.now();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.value}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: PROMPT }],
            },
          ],
        }),
      }
    );

    const data = await res.json();

    const time = Date.now() - start;

    console.log("==========================================");
    console.log(`Model : ${model}`);
    console.log(`API   : ${key.name}`);
    console.log(`Status: ${res.status}`);
    console.log(`Time  : ${time} ms`);

    if (res.ok) {
      console.log("✅ ACCESSIBLE");
      console.log(
        "Reply :",
        data.candidates?.[0]?.content?.parts?.[0]?.text
      );
    } else {
      console.log("❌ FAILED");
      console.log(
        data.error?.message || JSON.stringify(data, null, 2)
      );
    }

    console.log("");
  } catch (err) {
    console.log("==========================================");
    console.log(`Model : ${model}`);
    console.log(`API   : ${key.name}`);
    console.log("❌ ERROR");
    console.log(err.message);
    console.log("");
  }
}

(async () => {
  for (const model of MODELS) {
    console.log(`\n############ ${model} ############\n`);

    for (const key of KEYS) {
      await test(model, key);
    }
  }

  console.log("\n🎉 Finished testing all API keys.");
})();