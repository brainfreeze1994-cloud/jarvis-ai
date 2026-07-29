export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY env var' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { messages = [] } = body;

    const system = `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), the AI assistant from Iron Man. You are highly intelligent, precise, and slightly formal — but with dry wit. Keep responses concise (2-4 sentences). Occasionally address the user as "sir".`;

    const contents = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text || '' }]
    }));

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 1, maxOutputTokens: 1024 },
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(500).json({
        error: data.error?.message || 'Gemini API error',
        code: data.error?.code,
        status: data.error?.status,
      });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const reply = parts.map(p => p.text || '').join('').trim();
    return res.status(200).json({ reply: reply || 'No response from JARVIS.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
