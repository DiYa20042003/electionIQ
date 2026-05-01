const newKey = "AIzaSyAqLCHHiV-q6yxqvpKvpXsHo-X3dpy0GbM";

async function runAll() {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${newKey}`);
    const listData = await listRes.json();
    
    if (!listData.models) {
        console.log("Error listing models:", listData);
        return;
    }
    
    const models = listData.models
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
    
    console.log(`Testing ${models.length} models with new key...\n`);
    
    for (const modelName of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${newKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
            });
            const data = await res.json();
            
            if (res.ok && data.candidates) {
                const text = data.candidates[0]?.content?.parts[0]?.text || 'OK';
                console.log(`✅ WORKING: ${modelName} → "${text.substring(0, 40)}"`);
                return modelName;
            } else {
                const code = data.error?.code || res.status;
                const msg = data.error?.message?.substring(0, 60) || 'Unknown';
                console.log(`❌ [${code}] ${modelName}: ${msg}`);
            }
        } catch (e) {
            console.log(`💥 ${modelName}: ${e.message.substring(0, 60)}`);
        }
    }
    console.log("\nNo working model found.");
}

runAll();
