'use strict';
const WebSocket = require('ws');
const crypto = require('crypto');

const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_VERSION = '143.0.3650.75';

function getSecMsGec() {
  const WIN_EPOCH = 11644473600n;
  const now5min = BigInt(Math.floor(Date.now() / 1000 / 300) * 300);
  const ticks = (now5min + WIN_EPOCH) * 10000000n;
  return crypto.createHash('sha256')
    .update(ticks.toString() + TOKEN)
    .digest('hex').toUpperCase();
}

const VOICE_MAP = {
  british_male:    'en-GB-RyanNeural',
  british_female:  'en-GB-SoniaNeural',
  american_male:   'en-US-GuyNeural',
  american_female: 'en-US-AriaNeural',
  filipino_male: 'fil-PH-AngeloNeural',
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

const LANG_MAP = {
  british_male:    'en-GB',
  british_female:  'en-GB',
  american_male:   'en-US',
  american_female: 'en-US',
  filipino_male: 'fil-PH',
  filipino_female: 'fil-PH',
  french_male:     'fr-FR',
  french_female:   'fr-FR',
};

const SAMPLE_TEXT = {
  british_male:    'Good day, sir. I am H.E.N.R.Y, your Highly Enhanced Neural Reasoning assistant. How may I assist you today?',
  british_female:  'Good day, sir. I am H.E.N.R.Y, your Highly Enhanced Neural Reasoning assistant. How may I assist you today?',
  american_male:   'Hey there. I\'m H.E.N.R.Y, your Highly Enhanced Neural Reasoning assistant. What can I do for you?',
  american_female: 'Hello! I\'m H.E.N.R.Y, your Highly Enhanced Neural Reasoning assistant. What can I do for you?',
  filipino_male:   'Magandang araw, sir. I am H.E.N.R.Y, your personal AI assistant. How can I help you today?',
  filipino_female: 'Magandang araw! I am H.E.N.R.Y, your personal AI assistant. How can I help you today?',
  french_male:     'Bonjour monsieur. Je suis H.E.N.R.Y, votre assistant personnel. Comment puis-je vous aider?',
  french_female:   'Bonjour! Je suis H.E.N.R.Y, votre assistante personnelle. Comment puis-je vous aider?',
};

function randomHex(n) {
  let r = ''; const c = '0123456789abcdef';
  for (let i = 0; i < n; i++) {r += c[Math.floor(Math.random() * 16)];}
  return r;
}

function escapeXml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function synthesize(text, voiceKey) {
  const voiceName = VOICE_MAP[voiceKey] || VOICE_MAP.american_male;
  const prosody   = PROSODY_MAP[voiceKey] || 'rate="-2%" pitch="-4Hz"';
  const lang      = LANG_MAP[voiceKey] || 'en-US';

  return new Promise((resolve, reject) => {
    const connId = randomHex(32);
    const gec    = getSecMsGec();
    const url =
      'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1' +
      '?TrustedClientToken=' + TOKEN +
      '&Sec-MS-GEC=' + gec +
      '&Sec-MS-GEC-Version=1-' + CHROMIUM_VERSION +
      '&ConnectionId=' + connId;

    const ws = new WebSocket(url, {
      headers: {
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                      '(KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
      },
    });

    const chunks = []; let done = false;
    const finish = (err) => {
      if (done) {return;} done = true; clearTimeout(timer);
      try { ws.terminate(); } catch(_) {}
      if (err) {return reject(err);}
      const buf = Buffer.concat(chunks);
      if (!buf.length) {return reject(new Error('No audio received'));}
      resolve(buf);
    };

    const timer = setTimeout(() => finish(new Error('TTS timeout after 20s')), 20000);

    ws.on('open', () => {
      const reqId = randomHex(32), ts = new Date().toISOString();
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}',
      );
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
        `<voice name='${voiceName}'><prosody ${prosody}>${escapeXml(text)}</prosody></voice></speak>`;
      ws.send(
        `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}\r\nPath:ssml\r\n\r\n${ssml}`,
      );
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        if (data.length < 2) {return;}
        const hLen = data.readUInt16BE(0);
        const header = data.slice(2, 2 + hLen).toString('utf8');
        if (header.includes('Path:audio')) { const a = data.slice(2 + hLen); if (a.length) {chunks.push(a);} }
      } else {
        if (data.toString('utf8').includes('Path:turn.end')) {finish(null);}
      }
    });

    ws.on('error', (e) => finish(e));
    ws.on('close', () => finish(chunks.length ? null : new Error('WS closed with no audio')));
  });
}

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>H.E.N.R.Y Voice Demo</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:#0d0d0d; color:#c9a84c; font-family:sans-serif; max-width:620px; margin:40px auto; padding:20px; }
  h1 { letter-spacing:0.3em; font-size:18px; text-align:center; border-bottom:1px solid #c9a84c33; padding-bottom:14px; margin-bottom:8px; }
  .sub { color:#4a4030; text-align:center; font-size:11px; margin-bottom:24px; }
  .voice-btn {
    display:block; width:100%; margin:8px 0; padding:13px 16px;
    background:#111; border:1px solid #c9a84c33; color:#c9a84c;
    font-size:13px; cursor:pointer; text-align:left; letter-spacing:0.04em;
    transition:all 0.15s; border-radius:2px;
  }
  .voice-btn:hover { background:#1a1508; border-color:#c9a84c88; }
  .voice-btn.loading { opacity:0.6; cursor:wait; }
  .voice-btn.playing { background:#1a1508; border-color:#c9a84c; }
  .voice-btn.error { border-color:#8b2020; color:#c04040; }
  .sub-label { font-size:10px; color:#4a4030; margin-top:3px; }
  .err-box { background:#1a0808; border:1px solid #8b2020; padding:12px; margin-top:20px; font-size:11px; color:#c04040; display:none; border-radius:2px; }
</style>
</head>
<body>
<h1>◆ H.E.N.R.Y VOICE DEMO</h1>
<p class="sub">Click any voice to hear a sample — Microsoft Neural voices</p>

<button class="voice-btn" onclick="playVoice('british_male',this)">
  🇬🇧 British Male ♂
  <div class="sub-label">en-GB-RyanNeural · deep, authoritative</div>
</button>
<button class="voice-btn" onclick="playVoice('british_female',this)">
  🇬🇧 British Female ♀
  <div class="sub-label">en-GB-SoniaNeural · clear, refined</div>
</button>
<button class="voice-btn" onclick="playVoice('american_male',this)">
  🇺🇸 American Male ♂
  <div class="sub-label">en-US-GuyNeural · warm, confident</div>
</button>
<button class="voice-btn" onclick="playVoice('american_female',this)">
  🇺🇸 American Female ♀
  <div class="sub-label">en-US-AriaNeural · natural, expressive</div>
</button>
<button class="voice-btn" onclick="playVoice('filipino_male',this)">
  🇵🇭 Filipino Male ♂
  <div class="sub-label">en-PH-JamesNeural · Filipino-accented English</div>
</button>
<button class="voice-btn" onclick="playVoice('filipino_female',this)">
  🇵🇭 Filipino Female ♀
  <div class="sub-label">fil-PH-BlessicaNeural · natural Filipino</div>
</button>
<button class="voice-btn" onclick="playVoice('french_male',this)">
  🇫🇷 French Male ♂
  <div class="sub-label">fr-FR-HenriNeural · smooth French accent</div>
</button>
<button class="voice-btn" onclick="playVoice('french_female',this)">
  🇫🇷 French Female ♀
  <div class="sub-label">fr-FR-DeniseNeural · elegant French accent</div>
</button>

<div class="err-box" id="errBox"></div>

<script>
let currentAudio = null;
const allBtns = () => document.querySelectorAll('.voice-btn');

function playVoice(voice, btn) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  allBtns().forEach(b => b.classList.remove('playing','loading','error'));
  btn.classList.add('loading');

  fetch('/api/voice-demo?voice=' + voice)
    .then(r => {
      if (!r.ok) return r.text().then(t => { throw new Error('HTTP ' + r.status + ': ' + t); });
      return r.blob();
    })
    .then(blob => {
      btn.classList.remove('loading');
      btn.classList.add('playing');
      currentAudio = new Audio(URL.createObjectURL(blob));
      currentAudio.play();
      currentAudio.onended = () => btn.classList.remove('playing');
      document.getElementById('errBox').style.display = 'none';
    })
    .catch(e => {
      btn.classList.remove('loading');
      btn.classList.add('error');
      const eb = document.getElementById('errBox');
      eb.style.display = 'block';
      eb.textContent = 'Error on ' + voice + ': ' + e.message;
    });
}
</script>
</body>
</html>`;

const handler = async function(req, res) {
  const voice = (req.query && req.query.voice) || '';

  if (!voice || !VOICE_MAP[voice]) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(HTML);
  }

  try {
    const text  = SAMPLE_TEXT[voice] || SAMPLE_TEXT.american_male;
    const audio = await synthesize(text, voice);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(audio.length));
    return res.status(200).send(audio);
  } catch(err) {
    console.error('[voice-demo]', voice, err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = handler;
