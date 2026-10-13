require('dotenv').config();

const key = process.env.GEMINI_API_KEY;

if (!key) {
    console.error('❌ Error: GEMINI_API_KEY is not configured. Set it in .env or your environment variables.');
    process.exit(1);
}

async function test() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Say "ElectIQ backend is WORKING!" in exactly those words.' }] }] })
    });
    const data = await res.json();
    if (res.ok) {
        console.log('✅ SUCCESS! Response:', data.candidates[0].content.parts[0].text);
    } else {
        console.log(`❌ FAILED [${res.status}]:`, data.error?.message);
    }
}
test();
