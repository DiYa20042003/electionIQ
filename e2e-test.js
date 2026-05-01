const http = require('http');

const data = JSON.stringify({
    messages: [{ role: 'user', content: 'What is the election process in India? Give me a short answer.' }]
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/chat',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
};

let full = '';
const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', chunk => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                    const parsed = JSON.parse(line.replace('data: ', ''));
                    if (parsed.text) { process.stdout.write(parsed.text); full += parsed.text; }
                    if (parsed.error) console.log('\nERROR:', parsed.error);
                } catch(e) {}
            }
        }
    });
    res.on('end', () => {
        console.log('\n\n--- END ---');
        console.log(`Total chars received: ${full.length}`);
        if (full.length > 0) console.log('✅ BACKEND IS FULLY WORKING!');
        else console.log('❌ No text received');
    });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(data);
req.end();
