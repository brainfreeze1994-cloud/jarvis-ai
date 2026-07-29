export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const API_TOKEN  = process.env.CF_API_TOKEN;
  if (!ACCOUNT_ID || !API_TOKEN) {
    return res.status(500).json({ error: 'Missing CF_ACCOUNT_ID or CF_API_TOKEN env vars' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { messages = [] } = body;

    const chatMessages = [
      {
        role: 'system',
        content: `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), the AI assistant from Iron Man. You are highly intelligent, precise, and slightly formal — but with dry wit. Keep responses concise (2-4 sentences). Occasionally address the user as "sir".`
      },
      ...messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text || ''
      }))
    ];

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: chatMessages })
      }
    );

    const data = await cfRes.json();

    if (!cfRes.ok || !data.success) {
      return res.status(500).json({
        error: data.errors?.[0]?.message || 'Cloudflare AI error',
        details: data.errors
      });
    }

    const reply = data.result?.response?.trim() || 'No response from JARVIS.';
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
