module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(204).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const text = (body.text || '').trim().slice(0, 3000);
    if (!text) return res.status(204).end();

    const { EdgeTTS } = await import('@andresaya/edge-tts');
    const tts = new EdgeTTS();

    await tts.synthesize(text, 'en-GB-RyanNeural', {
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      pitch: '-5Hz',
      rate: '-8%',
      volume: '90%'
    });

    const audioBuffer = tts.toBuffer();
    if (!audioBuffer || audioBuffer.length === 0) return res.status(204).end();

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    return res.status(200).send(audioBuffer);

  } catch (e) {
    console.error('speak.js error:', e.message);
    return res.status(204).end();
  }
};
