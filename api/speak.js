// speak.js — Emotionally-aware Microsoft Edge TTS
// Voice: en-US-AndrewNeural (conversational, warm, natural American male)
// Pitch/rate/volume shift per emotion for authentic emotional expression

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(204).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let text = (body.text || '').trim();
    const emotion = (body.emotion || 'neutral').toLowerCase();
    if (!text) return res.status(204).end();

    // Strip markdown for clean speech
    const clean = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[-*]\s/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!clean) return res.status(204).end();

    // ── Emotion → voice parameters ────────────────────────────────────────────
    // Base: en-US-AndrewNeural — very conversational, warm, natural male
    const emotionMap = {
      neutral:   { pitch: '-5Hz',  rate: '-8%',  volume: '95%' },
      warm:      { pitch: '-2Hz',  rate: '-15%', volume: '90%' },
      concerned: { pitch: '-4Hz',  rate: '-18%', volume: '88%' },
      excited:   { pitch: '+4Hz',  rate: '+8%',  volume: '100%' },
      amused:    { pitch: '+2Hz',  rate: '-3%',  volume: '95%' },
      serious:   { pitch: '-10Hz', rate: '-18%', volume: '100%' },
      proud:     { pitch: '-4Hz',  rate: '-8%',  volume: '98%' },
    };

    const params = emotionMap[emotion] || emotionMap.neutral;

    const { EdgeTTS } = await import('@andresaya/edge-tts');
    const tts = new EdgeTTS();

    await tts.synthesize(clean, 'en-US-AndrewNeural', {
      outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
      pitch:  params.pitch,
      rate:   params.rate,
      volume: params.volume
    });

    const audioBuffer = tts.toBuffer();
    if (!audioBuffer || audioBuffer.length === 0) return res.status(204).end();

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(audioBuffer);

  } catch (e) {
    console.error('speak.js error:', e.message);
    return res.status(204).end();
  }
};
