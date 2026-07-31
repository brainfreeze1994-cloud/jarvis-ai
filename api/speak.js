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
    const { text = '' } = body;
    if (!text.trim()) return res.status(400).json({ error: 'No text provided' });

    // Strip markdown for clean speech
    const plain = text
      .replace(/```[\s\S]*?```/g,        'code block.')
      .replace(/`([^`]+)`/g,              '$1')
      .replace(/\*\*(.*?)\*\*/g,          '$1')
      .replace(/\*(.*?)\*/g,              '$1')
      .replace(/#{1,6}\s/g,               '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g,  '$1')
      .replace(/(?:^|\n)\s*[-*+]\s/gm,    ' ')
      .replace(/(?:^|\n)\s*\d+\.\s/gm,    ' ')
      .replace(/\n{2,}/g,                 '. ')
      .replace(/\n/g,                     ' ')
      .trim()
      .slice(0, 4000);

    if (!plain) return res.status(400).json({ error: 'Empty text after cleanup' });

    // Cloudflare Workers AI — Deepgram Aura-1
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/deepgram/aura-1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({
          text:  plain,
          voice: 'arcas'  // Natural male voice
        })
      }
    );

    if (!cfRes.ok) {
      const errText = await cfRes.text();
      console.error('Cloudflare TTS error:', errText);
      return res.status(cfRes.status).json({ error: 'Cloudflare TTS error: ' + errText.slice(0, 300) });
    }

    const audioBuffer = Buffer.from(await cfRes.arrayBuffer());

    if (audioBuffer.length < 100) {
      const str = audioBuffer.toString('utf8');
      return res.status(500).json({ error: 'TTS returned empty audio: ' + str.slice(0, 200) });
    }

    const contentType = cfRes.headers.get('content-type') || 'audio/mpeg';
    res.writeHead(200, {
      'Content-Type':   contentType,
      'Content-Length': audioBuffer.length,
      'Cache-Control':  'no-cache'
    });
    res.end(audioBuffer);

  } catch (err) {
    console.error('speak.js error:', err);
    return res.status(500).json({ error: err.message });
  }
};
