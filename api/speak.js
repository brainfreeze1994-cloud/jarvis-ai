// speak.js — TTS proxy, no character limits
// Tries free providers; returns 204 if all fail (Android uses native TTS as fallback)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { text = '' } = body;
    if (!text.trim()) return res.status(400).json({ error: 'No text provided' });

    // Strip markdown — NO character limit
    const plain = text
      .replace(/```[\s\S]*?```/g,        'code block.')
      .replace(/`([^`]+)`/g,             '$1')
      .replace(/\*\*(.*?)\*\*/g,         '$1')
      .replace(/\*(.*?)\*/g,             '$1')
      .replace(/#{1,6}\s/g,              '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/(?:^|\n)\s*[-*+]\s/gm,   ' ')
      .replace(/(?:^|\n)\s*\d+\.\s/gm,   ' ')
      .replace(/\n{2,}/g,                '. ')
      .replace(/\n/g,                    ' ')
      .trim();

    if (!plain) return res.status(400).json({ error: 'Empty text after cleanup' });

    // ── Provider 1: TikTok TTS ──────────────────────────────────────────────
    try {
      const ttRes = await fetch('https://tiktok-tts.weilbyte.dev/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plain, voice: 'en_male_narration' }),
        signal: AbortSignal.timeout(8000)
      });
      if (ttRes.ok) {
        const ttData = await ttRes.json();
        if (ttData.success && ttData.data) {
          const audioBuffer = Buffer.from(ttData.data, 'base64');
          if (audioBuffer.length > 500) {
            res.writeHead(200, {
              'Content-Type':   'audio/mpeg',
              'Content-Length': audioBuffer.length,
              'Cache-Control':  'no-cache'
            });
            return res.end(audioBuffer);
          }
        }
      }
    } catch (e) { /* fall through */ }

    // ── Provider 2: lazypy.ro StreamElements Brian ──────────────────────────
    try {
      const seRes = await fetch(
        `https://lazypy.ro/tts/request_tts.php?service=StreamElements&voice=Brian&text=${encodeURIComponent(plain)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
      );
      if (seRes.ok) {
        const seData = await seRes.json();
        if (seData.success && seData.audio_url) {
          const audioRes = await fetch(seData.audio_url, { signal: AbortSignal.timeout(8000) });
          if (audioRes.ok) {
            const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
            if (audioBuffer.length > 500) {
              res.writeHead(200, {
                'Content-Type':   'audio/mpeg',
                'Content-Length': audioBuffer.length,
                'Cache-Control':  'no-cache'
              });
              return res.end(audioBuffer);
            }
          }
        }
      }
    } catch (e) { /* fall through */ }

    // ── All providers failed — Android uses native TTS (unlimited, free) ────
    return res.status(204).end();

  } catch (err) {
    console.error('speak.js error:', err);
    return res.status(500).json({ error: err.message });
  }
};
