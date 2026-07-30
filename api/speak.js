module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'No text provided' });

  // Strip markdown
  const clean = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const CF_API_TOKEN = process.env.CF_API_TOKEN;

  try {
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/jaaari/kokoro-82m`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: clean, voice: 'bm_george' }),
      }
    );

    if (!cfRes.ok) {
      const err = await cfRes.text();
      console.error('Kokoro error:', err);
      return res.status(500).json({ error: 'TTS failed', detail: err });
    }

    const audioBuffer = await cfRes.arrayBuffer();
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(audioBuffer));
  } catch (e) {
    console.error('speak.js error:', e);
    res.status(500).json({ error: e.message });
  }
};
