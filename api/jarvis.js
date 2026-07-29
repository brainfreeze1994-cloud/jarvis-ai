------------------------------------------------------------------------------------------------------------------------
// @vercel/node
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const API_TOKEN  = process.env.CF_API_TOKEN;

  // Return env var status directly so we can see it
  if (!ACCOUNT_ID || !API_TOKEN) {
    return res.status(200).json({ 
      reply: 'DEBUG: Missing env vars. ACCOUNT_ID=' + !!ACCOUNT_ID + ' TOKEN=' + !!API_TOKEN 
    });
  }

  try {
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are JARVIS.' },
            { role: 'user', content: 'Say hello' }
          ]
        })
      }
    );

    const text = await cfRes.text();
    // Return raw response so we can see exactly what CF returns
    return res.status(200).json({ reply: 'CF status=' + cfRes.status + ' body=' + text.slice(0, 300) });

  } catch (err) {
    return res.status(200).json({ reply: 'CATCH ERROR: ' + err.message + ' stack=' + err.stack?.slice(0, 200) });
  }
}
