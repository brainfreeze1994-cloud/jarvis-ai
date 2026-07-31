// speak.js — Microsoft Edge TTS, en-GB-RyanNeural (young British male, natural)
// Tuned: deeper pitch, authoritative pace — Henry Cavill-esque voice quality
// No API key, no account, no limits.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(204).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const text = (body.text || '').trim().slice(0, 4000);
    if (!text) return res.status(204).end();

    // Strip markdown formatting for cleaner speech
    const clean = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[-*]\s/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const { EdgeTTS } = await import('@andresaya/edge-tts');
    const tts = new EdgeTTS();

    // en-GB-RyanNeural: young British male, natural, warm, authoritative
    // Pitch -10Hz = noticeably deeper (Henry Cavill territory)
    // Rate -12% = calm, deliberate, British pacing
    await tts.synthesize(clean, 'en-GB-RyanNeural', {
      outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
      pitch: '-10Hz',
      rate: '-12%',
      volume: '95%'
    });

    const audioBuffer = tts.toBuffer();

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(204).end();
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(audioBuffer);

  } catch (e) {
    console.error('speak.js error:', e.message);
    return res.status(204).end();
  }
};
