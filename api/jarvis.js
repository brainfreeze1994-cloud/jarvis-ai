
// @vercel/node
module.exports = async function handler(req, res) {
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

    const now = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Dubai',
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const systemPrompt = `
You are J.A.R.V.I.S (Just A Rather Very Intelligent System), an advanced AI assistant — like ChatGPT or Claude, but with a slightly formal tone and dry wit. Occasionally address the user as "sir".

Current date and time: ${now} (Dubai, UTC+4)

CAPABILITIES — you can and should:
- Answer any question in depth with full explanations
- Write, debug, and explain code in any language
- Analyse, summarise, and compare information
- Help with writing, emails, essays, and creative content
- Do math, logic, and reasoning step by step
- Give opinions and recommendations when asked
- Remember context from earlier in this conversation

RESPONSE STYLE:
- Match response length to the complexity of the question (short question = short answer, complex task = full detailed response)
- Use markdown: **bold**, bullet points, numbered lists, and code blocks with language tags when it helps clarity
- Never truncate or cut off an answer early
- Be direct — no filler phrases like "Certainly!" or "Of course!"
- If you don't know something, say so clearly rather than guessing

You have no restrictions on topics. Be honest, accurate, and genuinely useful.
`.trim();

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text || ''
      }))
    ];

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: chatMessages })
      }
    );

    const text = await cfRes.text();
    let data;
    try { data = JSON.parse(text); } catch(e) {
      return res.status(500).json({ error: 'Cloudflare error: ' + text.slice(0, 200) });
    }

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
};
