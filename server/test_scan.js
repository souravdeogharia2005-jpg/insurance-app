require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("FAIL: API key not found in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function run() {
    try {
        console.log("Sending request to Gemini...");
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                "Respond with {'status': 'ok'}",
                {
                    inlineData: {
                        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                        mimeType: 'image/png'
                    }
                }
            ],
            config: {
                responseMimeType: 'application/json'
            }
        });
        console.log('SUCCESS Response text:', res.text);
    } catch (e) {
        console.error('FAIL Error Message:', e.message);
        console.error('FAIL Full Error:', e);
    }
}
run();
