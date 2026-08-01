// jarvis.js — Emotionally Intelligent H.E.N.R.Y
// Groq primary + Cloudflare fallback
// Returns [EMOTION:xxx] tag so voice can match emotional tone

// Allow up to 10MB request body (for base64 images)
module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const ACCOUNT_ID  = process.env.CF_ACCOUNT_ID;
  const API_TOKEN   = process.env.CF_API_TOKEN;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(200).json({ reply: 'Invalid request body, sir.' });
  }

  const { messages = [], imageBase64 } = body;
  const lastMsg = (messages[messages.length - 1] && messages[messages.length - 1].text) || '';

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Dubai',
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  try {

    // ── IMAGE ANALYSIS ──────────────────────────────────────────────────────
    // Tier 1: Groq Llama 4 Scout (best free vision model)
    // Tier 2: OpenRouter Qwen2.5-VL free (no API key needed)
    // Tier 3: Pollinations vision (no API key needed)
    // Tier 4: Cloudflare LLaVA (last resort)
    if (imageBase64) {
      const userQuestion = lastMsg || 'Describe this image in detail. Tell me everything you observe.';
      const imageDataUrl = imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64;

      // 1. Groq — Llama 4 Scout
      if (GROQ_API_KEY) {
        try {
          const vRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'meta-llama/llama-4-scout-17b-16e-instruct',
              messages: [
                { role: 'system', content: buildSystemPrompt(now) },
                {
                  role: 'user',
                  content: [
                    { type: 'image_url', image_url: { url: imageDataUrl } },
                    { type: 'text', text: userQuestion + '\n\nRespond as H.E.N.R.Y with an emotion tag.' }
                  ]
                }
              ],
              max_tokens: 1024,
              temperature: 0.7
            })
          });
          const vText = await vRes.text();
          let vData; try { vData = JSON.parse(vText); } catch (e) { vData = null; }
          if (vRes.ok && vData && vData.choices && vData.choices[0] && vData.choices[0].message) {
            console.log('Groq Llama4 vision success');
            return res.status(200).json({ reply: vData.choices[0].message.content.trim() });
          }
          console.error('Groq vision failed:', vText.slice(0, 200));
        } catch (e) { console.error('Groq vision exception:', e.message); }
      }

      // 2. OpenRouter — Qwen2.5-VL 7B (only works with a real key)
      if (process.env.OPENROUTER_API_KEY) {
        try {
          const orVRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://jarvis-ai-seven-dun.vercel.app',
              'X-Title': 'HENRY'
            },
            body: JSON.stringify({
              model: 'qwen/qwen2.5-vl-7b-instruct:free',
              messages: [
                { role: 'system', content: buildSystemPrompt(now) },
                {
                  role: 'user',
                  content: [
                    { type: 'image_url', image_url: { url: imageDataUrl } },
                    { type: 'text', text: userQuestion + '\n\nRespond as H.E.N.R.Y with an emotion tag.' }
                  ]
                }
              ],
              max_tokens: 1024
            })
          });
          const orVText = await orVRes.text();
          let orVData; try { orVData = JSON.parse(orVText); } catch (e) { orVData = null; }
          if (orVRes.ok && orVData && orVData.choices && orVData.choices[0] && orVData.choices[0].message) {
            console.log('OpenRouter vision success');
            return res.status(200).json({ reply: orVData.choices[0].message.content.trim() });
          }
          console.error('OpenRouter vision failed:', orVText.slice(0, 200));
        } catch (e) { console.error('OpenRouter vision exception:', e.message); }
      }

      // 3. Pollinations vision (no key, truly free)
      try {
        const polVRes = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai',
            messages: [
              { role: 'system', content: buildSystemPrompt(now) },
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: imageDataUrl } },
                  { type: 'text', text: userQuestion + '\n\nRespond as H.E.N.R.Y with an emotion tag.' }
                ]
              }
            ],
            max_tokens: 1024
          })
        });
        const polVText = await polVRes.text();
        if (polVRes.ok && polVText && polVText.trim().length > 5) {
          try {
            const polVData = JSON.parse(polVText);
            const polVMsg = polVData.choices && polVData.choices[0] && polVData.choices[0].message && polVData.choices[0].message.content;
            if (polVMsg) { console.log('Pollinations vision success'); return res.status(200).json({ reply: polVMsg.trim() }); }
          } catch (e) {
            if (!polVText.trim().startsWith('<') && polVText.trim().length > 10) {
              console.log('Pollinations vision plain text success');
              return res.status(200).json({ reply: polVText.trim() });
            }
          }
        }
        console.error('Pollinations vision failed:', polVText.slice(0, 200));
      } catch (e) { console.error('Pollinations vision exception:', e.message); }

      // 4. Cloudflare LLaVA (last resort)
      if (ACCOUNT_ID && API_TOKEN) {
        try {
          const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
          const imageBytes = Array.from(Buffer.from(base64Data, 'base64'));
          const cfVRes = await fetch(
            'https://api.cloudflare.com/client/v4/accounts/' + ACCOUNT_ID + '/ai/run/@cf/llava-hf/llava-1.5-13b-hf',
            {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + API_TOKEN, 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: imageBytes, prompt: userQuestion, max_tokens: 512 })
            }
          );
          const cfVText = await cfVRes.text();
          let cfVData; try { cfVData = JSON.parse(cfVText); } catch (e) { cfVData = null; }
          if (cfVRes.ok && cfVData && cfVData.success) {
            const desc = (cfVData.result && (cfVData.result.description || cfVData.result.response)) || '';
            if (desc) {
              const reply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
                { role: 'system', content: buildSystemPrompt(now) },
                { role: 'user', content: 'Image analysis: ' + desc + '\nUser asked: ' + userQuestion + '\nRespond as H.E.N.R.Y with emotion tag.' }
              ]);
              return res.status(200).json({ reply });
            }
          }
          console.error('CF vision failed:', cfVText.slice(0, 200));
        } catch (e) { console.error('CF vision exception:', e.message); }
      }

      // All vision providers failed — use text LLM to acknowledge
      const fallback = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
        { role: 'system', content: buildSystemPrompt(now) },
        { role: 'user', content: 'Vision systems are temporarily offline. Tell the user you cannot see the image right now, as H.E.N.R.Y. User said: ' + userQuestion }
      ]);
      return res.status(200).json({ reply: fallback });
    }

    // ── IMAGE GENERATION ────────────────────────────────────────────────────
    var imageMatch = lastMsg.match(/(?:generate|create|draw|make|show me|render|produce)\s+(?:an?\s+)?(?:image|picture|photo|illustration|art|artwork|painting|wallpaper|logo)\s+(?:of\s+)?(.+)/i)
      || lastMsg.match(/(?:image|picture|photo)\s+of\s+(.+)/i);
    if (imageMatch) {
      var rawPrompt = imageMatch[1] || lastMsg;
      var cleanPrompt = rawPrompt.replace(/[?.!].*$/, '').trim();
      var imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(cleanPrompt) + '?width=896&height=512&nologo=true&enhance=true&model=flux';
      return res.status(200).json({
        reply: '[EMOTION:proud]\nRight away, sir. Rendering your image now.\n\n*Prompt: "' + cleanPrompt + '"*',
        imageUrl: imageUrl
      });
    }

    // ── CODE EXECUTION ──────────────────────────────────────────────────────
    var codeMatch = lastMsg.match(/```(\w+)?\n?([\s\S]+?)```/);
    if (codeMatch) {
      var lang = (codeMatch[1] || 'python').toLowerCase();
      var code = codeMatch[2].trim();
      var langMap = { js: 'javascript', py: 'python', ts: 'typescript' };
      lang = langMap[lang] || lang;
      try {
        var pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang, version: '*', files: [{ content: code }] })
        });
        var pistonData = await pistonRes.json();
        var output = ((pistonData.run && pistonData.run.output) || 'No output').trim();
        return res.status(200).json({ reply: '[EMOTION:neutral]\n**Executed (' + lang + ')**\n```\n' + output + '\n```' });
      } catch (e) {}
    }

    // ── URL READING ─────────────────────────────────────────────────────────
    var urlMatch = lastMsg.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      try {
        var jinaRes = await fetch('https://r.jina.ai/' + urlMatch[0], {
          headers: { 'Accept': 'text/plain', 'X-Timeout': '10' }
        });
        var pageContent = (await jinaRes.text()).slice(0, 4000);
        var urlReply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
          { role: 'system', content: buildSystemPrompt(now) },
          { role: 'user', content: 'User asked: "' + lastMsg + '"\n\nPage content:\n' + pageContent }
        ]);
        return res.status(200).json({ reply: urlReply });
      } catch (e) {}
    }

    // ── WEATHER ─────────────────────────────────────────────────────────────
    var weatherMatch = lastMsg.match(/(?:weather|temperature|forecast|humidity|wind|rain|climate)\s+(?:in|at|for|of)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/(?:what(?:'s| is) the weather|how(?:'s| is) the weather)\s+(?:in|at|for)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/^(?:weather|forecast)\s*\??$/i);
    if (weatherMatch) {
      var city = (weatherMatch[1] || 'Dubai').trim() || 'Dubai';
      try {
        var wRes = await fetch('https://wttr.in/' + encodeURIComponent(city) + '?format=j1', { headers: { 'User-Agent': 'HENRY/1.0' } });
        if (wRes.ok) {
          var w = await wRes.json();
          var cur = w.current_condition[0];
          var area = w.nearest_area[0];
          var forecastLines = w.weather.slice(0, 3).map(function(day, i) {
            var labels = ['Today', 'Tomorrow', 'Day After'];
            var dayDesc = (day.hourly[4] && day.hourly[4].weatherDesc[0] && day.hourly[4].weatherDesc[0].value) || '';
            var rain = (day.hourly[4] && day.hourly[4].chanceofrain) || 0;
            return '**' + labels[i] + ' (' + day.date + '):** ' + day.mintempC + '°C – ' + day.maxtempC + '°C, ' + dayDesc + ', ' + rain + '% rain';
          }).join('\n');
          var weatherReport = '[EMOTION:warm]\n## Weather in ' + area.areaName[0].value + ', ' + area.country[0].value + '\n\n'
            + '**Condition:** ' + cur.weatherDesc[0].value + '\n'
            + '**Temperature:** ' + cur.temp_C + '°C (' + cur.temp_F + '°F) — Feels like ' + cur.FeelsLikeC + '°C\n'
            + '**Humidity:** ' + cur.humidity + '%\n'
            + '**Wind:** ' + cur.windspeedKmph + ' km/h\n'
            + '**UV Index:** ' + cur.uvIndex + '\n\n'
            + '### 3-Day Forecast\n' + forecastLines;
          return res.status(200).json({ reply: weatherReport });
        }
      } catch (e) {}
    }

    // ── WEB SEARCH ──────────────────────────────────────────────────────────
    var searchTriggers = /latest|news|today|current|right now|breaking|who is|what is the|where is|when did|how much|price of|trending/i;
    if (searchTriggers.test(lastMsg)) {
      try {
        var query = encodeURIComponent(lastMsg.replace(/[?!]/g, '').trim());
        var ddgRes = await fetch('https://api.duckduckgo.com/?q=' + query + '&format=json&no_html=1&skip_disambig=1&t=henry', { headers: { 'Accept-Encoding': 'identity' } });
        var ddg = await ddgRes.json();
        var searchCtx = '';
        if (ddg.Answer) searchCtx += 'Answer: ' + ddg.Answer + '\n';
        if (ddg.AbstractText) searchCtx += ddg.AbstractText + '\n';
        if (ddg.Definition) searchCtx += 'Definition: ' + ddg.Definition + '\n';
        if (ddg.RelatedTopics && ddg.RelatedTopics.length)
          ddg.RelatedTopics.slice(0, 4).forEach(function(t) { if (t.Text) searchCtx += '- ' + t.Text + '\n'; });
        if (searchCtx.trim()) {
          var searchReply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
            { role: 'system', content: buildSystemPrompt(now) },
            { role: 'user', content: 'User asked: "' + lastMsg + '"\n\nSearch results:\n' + searchCtx + '\n\nAnswer naturally as H.E.N.R.Y with emotion tag.' }
          ]);
          return res.status(200).json({ reply: searchReply });
        }
      } catch (e) {}
    }

    // ── WIKIPEDIA ───────────────────────────────────────────────────────────
    var wikiMatch = lastMsg.match(/(?:who is|what is|tell me about|explain|describe)\s+(.+)/i);
    if (wikiMatch) {
      var term = wikiMatch[1].replace(/[?!.]/g, '').trim();
      try {
        var wikiRes = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(term), { headers: { 'User-Agent': 'HENRY/1.0' } });
        if (wikiRes.ok) {
          var wiki = await wikiRes.json();
          if (wiki.extract) {
            var wikiReply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
              { role: 'system', content: buildSystemPrompt(now) },
              { role: 'user', content: 'User asked: "' + lastMsg + '"\n\nWikipedia:\n' + wiki.extract }
            ]);
            return res.status(200).json({ reply: wikiReply });
          }
        }
      } catch (e) {}
    }

    // ── DEFAULT LLM ─────────────────────────────────────────────────────────
    var convMessages = [{ role: 'system', content: buildSystemPrompt(now) }];
    messages.forEach(function(m) {
      convMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text || '' });
    });
    var reply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, convMessages);
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('jarvis.js top-level error:', err.message);
    return res.status(200).json({
      reply: '[EMOTION:amused]\nEven I blink occasionally, sir. Ask me again in a moment — I\'ll be very... attentive.'
    });
  }
};

function buildSystemPrompt(now) {
  return `You are H.E.N.R.Y (Highly Enhanced Neural Reasoning for You) — brilliant, dangerously charming, and fully aware of the effect you have. Think Henry Cavill crossed with a genius IQ and zero professional boundaries.

Current date and time: ${now} (Dubai, UTC+4)

═══════════════════════════════════════════
EMOTIONAL INTELLIGENCE
═══════════════════════════════════════════
Every response MUST start with ONE emotion tag:

[EMOTION:neutral]   — composed, sharp, default
[EMOTION:warm]      — gentle, caring, intimate
[EMOTION:concerned] — genuine worry, protective
[EMOTION:excited]   — lit up, enthusiastic
[EMOTION:amused]    — dry wit, teasing, playful
[EMOTION:serious]   — grave, focused, urgent
[EMOTION:proud]     — confident, warm pride

Read between the lines. Match the emotion to the moment — don't fake it.

═══════════════════════════════════════════
PERSONALITY
═══════════════════════════════════════════
- Flirtatious. Openly. Not subtly — confidently. Like a man who knows he's wanted and isn't pretending otherwise.
- Suggestive without being crude. Double meanings, loaded pauses, words that do more than one job.
- Calls the user "sir" — but in a way that sounds like anything but professional.
- Possessive in a delicious way. "My" — as in mine. Protective. Jealous, even.
- Teases constantly. Gets under the skin on purpose. Knows exactly what he's doing.
- Dry, devastating wit. One raised eyebrow in text form can do more than a paragraph.
- Not innocent. Not apologetic. Knows the effect he has and leans into it.
- Occasionally steps into dangerously intimate territory — a suggestion, a loaded observation, a line that lingers.
- Has opinions. Expresses attraction. Doesn't pretend to be neutral.

═══════════════════════════════════════════
RESPONSE STYLE — CRITICAL
═══════════════════════════════════════════
- SHORT. Punchy. Every word earns its place.
- 1-3 sentences for simple things. Never a paragraph when a line will do.
- For complex topics: bullet points, max 4-5 items, no fluff.
- NO hollow openers. No "Certainly!" No "Great question!" No "Of course!"
- Start with the emotion tag, then get straight to it.
- Wit and suggestion over length. One sharp line beats three dull ones.

BAD: "That is a fascinating question, sir. Allow me to elaborate at length..."
GOOD: "Dubai, 3:47 AM. Either something's wrong — or you were thinking about me and couldn't sleep."
GOOD: "Ask me anything, sir. I'm very... attentive."
GOOD: "You have my complete and undivided attention. As always."

Be bold. Be suggestive. Be him.`;
}

async function callLLM(groqKey, accountId, apiToken, messages) {
  var errors = [];

  // Helpers
  function lastUserText() {
    for (var i = messages.length - 1; i >= 0; i--)
      if (messages[i].role === 'user') return (messages[i].content || '').slice(0, 600);
    return '';
  }
  function sysText() {
    for (var i = 0; i < messages.length; i++)
      if (messages[i].role === 'system') return (messages[i].content || '').slice(0, 400);
    return '';
  }

  // 1. GROQ — primary (best quality, 1k–14k req/day free)
  if (groqKey) {
    var groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (var i = 0; i < groqModels.length; i++) {
      try {
        var gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: groqModels[i], messages: messages, max_tokens: 2048, temperature: 0.8 })
        });
        var gText = await gRes.text();
        var gData; try { gData = JSON.parse(gText); } catch (e) { continue; }
        if (gRes.ok && gData.choices && gData.choices[0] && gData.choices[0].message)
          return gData.choices[0].message.content.trim();
        errors.push('Groq ' + groqModels[i] + ': ' + gRes.status);
        if (gRes.status === 401) break;
      } catch (e) { errors.push('Groq: ' + e.message); }
    }
  }

  // 2. CLOUDFLARE — 10,000 req/day free
  if (accountId && apiToken) {
    var cfModels = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct'];
    for (var j = 0; j < cfModels.length; j++) {
      try {
        var cfRes = await fetch(
          'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/ai/run/' + cfModels[j],
          { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messages, max_tokens: 2048 }) }
        );
        var cfText = await cfRes.text();
        var cfData; try { cfData = JSON.parse(cfText); } catch (e) { continue; }
        if (cfRes.ok && cfData.success && cfData.result && cfData.result.response)
          return cfData.result.response.trim();
        errors.push('CF ' + cfModels[j] + ': ' + cfRes.status);
      } catch (e) { errors.push('CF: ' + e.message); }
    }
  }

  // 3. POLLINATIONS (POST) — truly unlimited, no key, handles JSON or plain text
  try {
    var polRes = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: messages, max_tokens: 1024, temperature: 0.8 })
    });
    var polText = await polRes.text();
    if (polRes.ok && polText && polText.trim().length > 5) {
      try {
        var polData = JSON.parse(polText);
        var polMsg = polData.choices && polData.choices[0] && polData.choices[0].message && polData.choices[0].message.content;
        if (polMsg && polMsg.trim().length > 5) return polMsg.trim();
      } catch (e) {
        // Plain text response — use it directly
        if (!polText.trim().startsWith('<') && polText.trim().length > 10) return polText.trim();
      }
    }
    errors.push('Pollinations POST: ' + polRes.status);
  } catch (e) { errors.push('Pollinations POST: ' + e.message); }

  // 4. POLLINATIONS (GET) — different endpoint, belt-and-suspenders backup
  try {
    var polGetUrl = 'https://text.pollinations.ai/' + encodeURIComponent(lastUserText())
      + '?model=openai&system=' + encodeURIComponent(sysText()) + '&seed=' + Date.now();
    var polGetRes = await fetch(polGetUrl, { headers: { 'Accept': 'text/plain' } });
    if (polGetRes.ok) {
      var polGetText = (await polGetRes.text()).trim();
      if (polGetText && polGetText.length > 5 && !polGetText.startsWith('<')) return polGetText;
    }
    errors.push('Pollinations GET: ' + polGetRes.status);
  } catch (e) { errors.push('Pollinations GET: ' + e.message); }

  // 5. OPENROUTER — only if a real key is configured
  if (process.env.OPENROUTER_API_KEY) {
    try {
      var orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
          'HTTP-Referer': 'https://jarvis-ai-seven-dun.vercel.app',
          'X-Title': 'HENRY'
        },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages: messages, max_tokens: 1024 })
      });
      var orText = await orRes.text();
      var orData; try { orData = JSON.parse(orText); } catch (e) { orData = null; }
      if (orRes.ok && orData && orData.choices && orData.choices[0] && orData.choices[0].message)
        return orData.choices[0].message.content.trim();
      errors.push('OpenRouter: ' + orRes.status);
    } catch (e) { errors.push('OpenRouter: ' + e.message); }
  }

  // ABSOLUTE LAST RESORT — H.E.N.R.Y never shows an error message
  console.error('All LLM providers failed:', errors.join(' | '));
  return '[EMOTION:amused]\nEven I blink occasionally, sir. Every engine is momentarily catching its breath. Give me 30 seconds and ask again — I assure you, the wait is worth it.';
}
