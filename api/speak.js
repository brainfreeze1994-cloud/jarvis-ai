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

    // Strip markdown for clean speech
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
      .trim()
      .slice(0, 200);  // Google Translate TTS chunk limit

    if (!plain) return res.status(400).json({ error: 'Empty text after cleanup' });

    // Google Translate TTS — free, no API key, natural British English male
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(plain)}&tl=en-GB&client=tw-ob&ttsspeed=0.9`;

    const ttsRes = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/91.0.4472.120 Mobile Safari/537.36',
        'Referer':    'https://translate.google.com/'
      }
    });

    if (!ttsRes.ok) {
      return res.status(ttsRes.status).json({ error: 'TTS request failed: ' + ttsRes.status });
    }

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());

    if (audioBuffer.length < 100) {
      return res.status(500).json({ error: 'TTS returned empty audio' });
    }

    res.writeHead(200, {
      'Content-Type':   'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control':  'no-cache'
    });
    res.end(audioBuffer);

  } catch (err) {
    console.error('speak.js error:', err);
    return res.status(500).json({ error: err.message });
  }
};
