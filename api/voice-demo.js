'use strict';
// GET /api/voice-demo?voice=british_male  — returns MP3 audio directly in browser
const WebSocket = require('ws');

const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

const VOICE_MAP = {
  british_male:    'en-GB-RyanNeural',
  british_female:  'en-GB-SoniaNeural',
  american_male:   'en-US-GuyNeural',
  american_female: 'en-US-AriaNeural',
  filipino_male:   'en-PH-JamesNeural',
  filipino_female: 'fil-PH-BlessicaNeural',
  french_male:     'fr-FR-HenriNeural',
  french_female:   'fr-FR-DeniseNeural',
};

const PROSODY_MAP = {
  british_male:    'rate="-3%" pitch="-8Hz"',
  british_female:  'rate="+0%" pitch="+0Hz"',
  american_male:   'rate="-2%" pitch="-6Hz"',
  american_female: 'rate="+0%" pitch="+0Hz"',
  filipino_male:   'rate="-2%" pitch="-4Hz"',
  filipino_female: 'rate="+0%" pitch="+0Hz"',
  french_male:     'rate="-3%" pitch="-6Hz"',
  french_female:   'rate="+0%" pitch="+0Hz"',
};

const SAMPLE_TEXT = {
  british_male:    "Good day, sir. I am H.E.N.R.Y, your Highly Enhanced Neural Reasoning assistant. How may I assist you today?",
  british_female:  "Good day, sir. I am H.E.N.R.Y, your Highly Enhanced Neural Reasoning assistant. How may I assist you today?",
  american_male:   "Hey there. I'm H.E.N.R.Y, your Highly Enhanced Neural Reasoning assistant. What can I do for you?",
  american_female: "Hello! I'm H.E.N.R.Y, your Highly Enhanced Neural Reasoning assistant. What can I do for you?",
  filipino_male:   "Magandang araw, sir. I am H.E.N.R.Y, your personal AI assistant. How can I help you today?",
  filipino_female: "Magandang araw! I am H.E.N.R.Y, your personal AI assistant. How can I help you today?",
  french_male:     "Bonjour monsieur. Je suis H.E.N.R.Y, votre assistant personnel. Comment puis-je vous aider?",
  french_female:   "Bonjour! Je suis H.E.N.R.Y, votre assistante personnelle. Comment puis-je vous aider?",
};

function randomHex(n) {
  let r = ''; const c = '0123456789abcdef';
  for (let i = 0; i < n; i++) r += c[Math.floor(Math.random() * 16)];
  return r;
}

function escapeXml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
             .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function synthesize(text, voiceKey) {
  const voiceName = VOICE_MAP[voiceKey] || VOICE_MAP.british_male;
  const prosody   = PROSODY_MAP[voiceKey] || 'rate="-2%" pitch="-4Hz"';
  return new Promise((resolve, reject) => {
    const connId = randomHex(32);
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/realtimeTTS/edge/v1?TrustedClientToken=${TOKEN}&ConnectionId=${connId}`;
    const ws = new WebSocket(url, {
      headers: {
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
      }
    });
    const chunks = []; let done = false;
    const finish = (err) => {
      if (done) return; done = true; clearTimeout(timer);
      try { ws.terminate(); } catch(_) {}
      if (err) return reject(err);
      const buf = Buffer.concat(chunks);
      if (!buf.length) return reject(new Error('No audio'));
      resolve(buf);
    };
    const timer = setTimeout(() => finish(new Error('timeout')), 13000);
    ws.on('open', () => {
      const reqId = randomHex(32), ts = new Date().toISOString();
      ws.send(`X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voiceName}'><prosody ${prosody}>${escapeXml(text)}</prosody></voice></speak>`;
      ws.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}\r\nPath:ssml\r\n\r\n${ssml}`);
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        if (data.length < 2) return;
        const hLen = data.readUInt16BE(0);
        const header = data.slice(2, 2 + hLen).toString('utf8');
        if (header.includes('Path:audio')) { const a = data.slice(2 + hLen); if (a.length) chunks.push(a); }
      } else {
        if (data.toString('utf8').includes('Path:turn.end')) finish(null);
      }
    });
    ws.on('error', finish);
    ws.on('close', () => finish(chunks.length ? null : new Error('closed early')));
  });
}

function getFlag(v) {
  if (v.startsWith('british'))  return '🇬🇧';
  if (v.startsWith('american')) return '🇺🇸';
  if (v.startsWith('filipino')) return '🇵🇭';
  if (v.startsWith('french'))   return '🇫🇷';
  return '';
}
function getLabel(v) {
  const parts = v.split('_');
  const accent = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const gender = parts[1] === 'male' ? 'Male ♂' : 'Female ♀';
  return `${accent} ${gender}`;
}

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>H.E.N.R.Y Voice Demo</title>
<style>
  body { background:#0d0d0d; color:#c9a84c; font-family:sans-serif; max-width:600px; margin:40px auto; padding:20px; }
  h1 { letter-spacing:0.3em; font-size:20px; text-align:center; border-bottom:1px solid #c9a84c33; padding-bottom:16px; }
  p { color:#6a5c38; text-align:center; font-size:12px; margin-bottom:30px; }
  .voice-btn {
    display:block; width:100%; margin:10px 0; padding:14px 20px;
    background:#111; border:1px solid #c9a84c44; color:#c9a84c;
    font-size:13px; cursor:pointer; text-align:left; letter-spacing:0.05em;
    transition:background 0.2s;
  }
  .voice-btn:hover { background:#1a1508; border-color:#c9a84c; }
  .voice-btn.playing { background:#1a1508; border-color:#c9a84c; color:#fff; }
  .label { font-size:10px; color:#4a4030; margin-top:3px; }
</style>
</head>
<body>
<h1>◆ H.E.N.R.Y VOICE DEMO</h1>
<p>Click any voice to hear a sample. Each one is a real Microsoft Neural voice.</p>
<button class="voice-btn" onclick="playVoice('british_male', this)">🇬🇧 British Male ♂<div class="label">en-GB-RyanNeural — deep, authoritative</div></button>
<button class="voice-btn" onclick="playVoice('british_female', this)">🇬🇧 British Female ♀<div class="label">en-GB-SoniaNeural — clear, refined</div></button>
<button class="voice-btn" onclick="playVoice('american_male', this)">🇺🇸 American Male ♂<div class="label">en-US-GuyNeural — warm, confident</div></button>
<button class="voice-btn" onclick="playVoice('american_female', this)">🇺🇸 American Female ♀<div class="label">en-US-AriaNeural — natural, expressive</div></button>
<button class="voice-btn" onclick="playVoice('filipino_male', this)">🇵🇭 Filipino Male ♂<div class="label">en-PH-JamesNeural — Filipino-accented English</div></button>
<button class="voice-btn" onclick="playVoice('filipino_female', this)">🇵🇭 Filipino Female ♀<div class="label">fil-PH-BlessicaNeural — natural Tagalog/Filipino</div></button>
<button class="voice-btn" onclick="playVoice('french_male', this)">🇫🇷 French Male ♂<div class="label">fr-FR-HenriNeural — smooth, French accent</div></button>
<button class="voice-btn" onclick="playVoice('french_female', this)">🇫🇷 French Female ♀<div class="label">fr-FR-DeniseNeural — elegant, French accent</div></button>
<script>
let currentAudio = null;
let currentBtn = null;
function playVoice(voice, btn) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (currentBtn) currentBtn.classList.remove('playing');
  currentBtn = btn;
  btn.classList.add('playing');
  const origHTML = btn.innerHTML;
  btn.innerHTML = '⏳ Loading ' + voice.replace('_',' ') + '...';
  fetch('/api/voice-demo?voice=' + voice)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
    .then(blob => {
      btn.innerHTML = origHTML;
      const url = URL.createObjectURL(blob);
      currentAudio = new Audio(url);
      currentAudio.play();
      currentAudio.onended = () => { btn.classList.remove('playing'); currentBtn = null; };
    })
    .catch(e => { btn.innerHTML = '❌ Error: ' + e.message; btn.classList.remove('playing'); });
}
</script>
</body>
</html>`;

const handler = async function(req, res) {
  const voice = (req.query && req.query.voice) || '';

  if (!voice || !VOICE_MAP[voice]) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(HTML);
  }

  try {
    const text  = SAMPLE_TEXT[voice] || SAMPLE_TEXT.british_male;
    const audio = await synthesize(text, voice);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(audio.length));
    return res.status(200).send(audio);
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = handler;
