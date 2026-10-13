require('dotenv').config();

const key = process.env.GEMINI_API_KEY;

if (!key) {
    console.error('❌ Error: GEMINI_API_KEY is not configured. Set it in .env or your environment variables.');
    process.exit(1);
}

const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
];

async function test() {
    for (const model of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
        });
        const data = await res.json();
        if (res.ok && data.candidates) {
            const text = data.candidates[0]?.content?.parts[0]?.text || '';
            console.log(`✅ WORKING: ${model} → "${text.substring(0, 60)}"`);
            return model;
        } else {
            const msg = data.error?.message?.substring(0, 80) || 'Unknown';
            console.log(`❌ [${res.status}] ${model}: ${msg}`);
        }
    }
    console.log("\nNo working model found with this key.");
}

test();
