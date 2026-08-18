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

function randomHex(n) {
  let r = '';
  const c = '0123456789abcdef';
  for (let i = 0; i < n; i++) {r += c[Math.floor(Math.random() * 16)];}
  return r;
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

    const audioChunks = [];
    let done = false;

    const finish = (err) => {
      if (done) {return;}
      done = true;
      clearTimeout(timer);
      try { ws.terminate(); } catch (_) {}
      if (err) {return reject(err);}
      const buf = Buffer.concat(audioChunks);
      if (buf.length === 0) {return reject(new Error('No audio'));}
      resolve(buf);
    };

    const timer = setTimeout(() => finish(new Error('TTS timeout')), 20000);

    ws.on('open', () => {
      const reqId = randomHex(32);
      const ts    = new Date().toISOString();

      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}',
      );

      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
        `<voice name='${voiceName}'>` +
        `<prosody ${prosody}>${escapeXml(text)}</prosody>` +
        '</voice></speak>';

      ws.send(
        `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${ts}\r\nPath:ssml\r\n\r\n${ssml}`,
      );
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        if (data.length < 2) {return;}
        const headerLen = data.readUInt16BE(0);
        if (data.length < 2 + headerLen) {return;}
        const header = data.slice(2, 2 + headerLen).toString('utf8');
        if (header.includes('Path:audio')) {
          const audio = data.slice(2 + headerLen);
          if (audio.length > 0) {audioChunks.push(audio);}
        }
      } else {
        if (data.toString('utf8').includes('Path:turn.end')) {finish(null);}
      }
    });

    ws.on('error', (err) => finish(err));
    ws.on('close', () => finish(audioChunks.length > 0 ? null : new Error('Closed early')));
  });
}

const handler = async function (req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { text, voice = 'american_male' } = req.body || {};
  if (!text || !text.trim()) { res.status(400).end(); return; }

  try {
    const audio = await synthesize(text.trim(), voice);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(audio.length));
    res.status(200).send(audio);
  } catch (err) {
    console.error('[speak]', err.message);
    res.status(204).end();
  }
};

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: { sizeLimit: '512kb' },
    responseLimit: '8mb',
  },
};
