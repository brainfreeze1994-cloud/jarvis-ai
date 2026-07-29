// Vercel Serverless Function — runs on the server, key never exposed to users
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'Server not configured. Add GEMINI_API_KEY to Vercel environment variables.' });

  try {
    const { messages = [], image = null } = req.body;
    const system = `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), the AI assistant from Iron Man. You are highly intelligent, precise, and slightly formal — but with dry wit. Keep responses concise and conversational (2-4 sentences unless detail is needed). Address the user as "sir" occasionally.`;

    const contents = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const isLast = i === messages.length - 1;
      const role = m.role === 'user' ? 'user' : 'model';

      if (isLast && role === 'user') {
        const parts = [];
        if (image?.base64 && image?.mime) {
          parts.push({ inlineData: { mimeType: image.mime, data: image.base64 } });
        }
        parts.push({ text: m.text || '' });
        contents.push({ role: 'user', parts });
      } else {
        contents.push({ role, parts: [{ text: m.text || '' }] });
      }
    }

    const geminiBody = {
      system_instruction: { parts: [{ text: system }] },
      contents,
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 8192 },
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(500).json({ error: data.error?.message || 'Gemini API error' });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const reply = parts.filter(p => !p.thought).map(p => p.text || '').join('');

    return res.status(200).json({ reply: reply || 'I encountered an issue. Please try again.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
