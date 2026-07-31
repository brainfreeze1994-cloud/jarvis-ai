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
      .slice(0, 300);

    if (!plain) return res.status(400).json({ error: 'Empty text after cleanup' });

    // StreamElements TTS — free, no API key, works server-side
    // Brian = British male, good quality
    const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${encodeURIComponent(plain)}`;

    const ttsRes = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JARVIS/1.0)'
      }
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error('StreamElements TTS error:', ttsRes.status, errText.slice(0, 200));
      return res.status(ttsRes.status).json({ error: 'TTS failed: ' + ttsRes.status });
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
