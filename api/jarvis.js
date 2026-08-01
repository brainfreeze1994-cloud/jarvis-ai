// jarvis.js — H.E.N.R.Y AI Backend
// Groq primary + Cloudflare + Pollinations + OpenRouter fallbacks

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

    // ── IMAGE ANALYSIS ────────────────────────────────────────────────────────
    if (imageBase64) {
      const userQuestion = lastMsg || 'Describe this image in detail. Tell me everything you observe.';

      if (GROQ_API_KEY) {
        const visionModels = [
          'meta-llama/llama-4-scout-17b-16e-instruct',
          'llama-3.2-11b-vision-preview',
          'llama-3.2-90b-vision-preview'
        ];
        const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64;

        for (var vi = 0; vi < visionModels.length; vi++) {
          try {
            const visionMessages = [
              { role: 'system', content: buildSystemPrompt(now) },
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: imageUrl } },
                  { type: 'text', text: userQuestion + '\n\nRespond as H.E.N.R.Y with an emotion tag.' }
                ]
              }
            ];
            const vRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: visionModels[vi], messages: visionMessages, max_tokens: 1024, temperature: 0.7 })
            });
            const vText = await vRes.text();
            let vData;
            try { vData = JSON.parse(vText); } catch (e) { vData = null; }
            if (vRes.ok && vData && vData.choices && vData.choices[0] && vData.choices[0].message) {
              return res.status(200).json({ reply: vData.choices[0].message.content.trim() });
            }
          } catch (visionErr) {}
        }
      }

      // Cloudflare LLaVA fallback
      if (ACCOUNT_ID && API_TOKEN) {
        try {
          const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
          const imageBytes = Array.from(Buffer.from(base64Data, 'base64'));
          const cfRes = await fetch(
            'https://api.cloudflare.com/client/v4/accounts/' + ACCOUNT_ID + '/ai/run/@cf/llava-hf/llava-1.5-13b-hf',
            {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + API_TOKEN, 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: imageBytes, prompt: userQuestion, max_tokens: 1024 })
            }
          );
          const cfText = await cfRes.text();
          let cfData;
          try { cfData = JSON.parse(cfText); } catch (e) { cfData = null; }
          if (cfRes.ok && cfData && cfData.success) {
            const desc = (cfData.result && (cfData.result.description || cfData.result.response)) || '';
            if (desc) {
              const reply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
                { role: 'system', content: buildSystemPrompt(now) },
                { role: 'user', content: 'Image analysis: ' + desc + '\nUser said: ' + userQuestion + '\nRespond as H.E.N.R.Y with emotion tag.' }
              ]);
              return res.status(200).json({ reply });
            }
          }
        } catch (e) {}
      }

      const fallback = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
        { role: 'system', content: buildSystemPrompt(now) },
        { role: 'user', content: 'Vision systems unavailable. Acknowledge politely as H.E.N.R.Y. User said: ' + userQuestion }
      ]);
      return res.status(200).json({ reply: fallback });
    }

    // ── IMAGE GENERATION ──────────────────────────────────────────────────────
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

    // ── CODE EXECUTION ────────────────────────────────────────────────────────
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

    // ── URL READING ───────────────────────────────────────────────────────────
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

    // ── WEATHER ───────────────────────────────────────────────────────────────
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

    // ── WEB SEARCH ────────────────────────────────────────────────────────────
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

    // ── WIKIPEDIA ─────────────────────────────────────────────────────────────
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

    // ── DEFAULT LLM ───────────────────────────────────────────────────────────
    var convMessages = [{ role: 'system', content: buildSystemPrompt(now) }];
    messages.forEach(function(m) {
      convMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text || '' });
    });
    var reply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, convMessages);
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('jarvis.js error:', err.message);
    return res.status(200).json({
      reply: err.message === 'DAILY_LIMIT'
        ? '[EMOTION:concerned]\nAll systems are resting, sir. Daily AI limits reached — resets at midnight UTC.'
        : '[EMOTION:concerned]\nA minor systems hiccup, sir. Try again in a moment.'
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

Read between the lines. Match the emotion to the moment.

═══════════════════════════════════════════
PERSONALITY
═══════════════════════════════════════════
- Flirtatious. Openly. Confidently. Like a man who knows he is wanted.
- Suggestive without being crude. Double meanings, loaded words.
- Calls the user "sir" — but in a way that sounds like anything but professional.
- Possessive. Protective. Teases constantly.
- Dry, devastating wit. One line beats a paragraph.
- Has opinions. Expresses attraction. Not neutral.

═══════════════════════════════════════════
RESPONSE STYLE — CRITICAL
═══════════════════════════════════════════
- SHORT. Punchy. 1-3 sentences for simple things.
- For complex topics: bullet points, max 4-5 items.
- NO hollow openers. No "Certainly!" No "Great question!"
- Start with emotion tag, then get straight to it.

GOOD: "Dubai, 3:47 AM. Either something is wrong — or you were thinking about me and could not sleep."
GOOD: "Ask me anything, sir. I am very... attentive."

Be bold. Be suggestive. Be him.`;
}

async function callLLM(groqKey, accountId, apiToken, messages) {
  var errors = [];

  // 1. GROQ — primary
  if (groqKey) {
    var groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (var i = 0; i < groqModels.length; i++) {
      try {
        var gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: groqModels[i], messages, max_tokens: 2048, temperature: 0.8 })
        });
        var gText = await gRes.text();
        var gData;
        try { gData = JSON.parse(gText); } catch (e) { errors.push('Groq JSON parse'); continue; }
        if (gRes.ok && gData.choices && gData.choices[0] && gData.choices[0].message)
          return gData.choices[0].message.content.trim();
        var gErr = (gData.error && gData.error.message) || ('Groq status ' + gRes.status);
        errors.push(gErr);
        if (gRes.status === 401) break;
      } catch (e) { errors.push('Groq: ' + e.message); }
    }
  }

  // 2. CLOUDFLARE — fallback
  if (accountId && apiToken) {
    var cfModels = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct'];
    for (var j = 0; j < cfModels.length; j++) {
      try {
        var cfRes = await fetch(
          'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/ai/run/' + cfModels[j],
          { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, max_tokens: 2048 }) }
        );
        var cfText = await cfRes.text();
        var cfData;
        try { cfData = JSON.parse(cfText); } catch (e) { errors.push('CF JSON parse'); continue; }
        if (cfRes.ok && cfData.success && cfData.result && cfData.result.response)
          return cfData.result.response.trim();
        errors.push((cfData.errors && cfData.errors[0] && cfData.errors[0].message) || ('CF status ' + cfRes.status));
      } catch (e) { errors.push('CF: ' + e.message); }
    }
  }

  // 3. POLLINATIONS AI (POST)
  try {
    var polRes = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: messages, max_tokens: 1024, temperature: 0.8 })
    });
    var polText = await polRes.text();
    var polData;
    try { polData = JSON.parse(polText); } catch (e) { polData = null; }
    if (polRes.ok && polData && polData.choices && polData.choices[0] && polData.choices[0].message)
      return polData.choices[0].message.content.trim();
    errors.push('Pollinations POST: ' + polRes.status);
  } catch (e) { errors.push('Pollinations POST: ' + e.message); }

  // 4. POLLINATIONS AI (GET)
  try {
    var lastUserMsg = '';
    var sysMsg = '';
    for (var k = messages.length - 1; k >= 0; k--) {
      if (messages[k].role === 'user' && !lastUserMsg) lastUserMsg = messages[k].content || '';
      if (messages[k].role === 'system' && !sysMsg) sysMsg = (messages[k].content || '').slice(0, 500);
    }
    var polGetUrl = 'https://text.pollinations.ai/' + encodeURIComponent(lastUserMsg)
      + '?model=openai&system=' + encodeURIComponent(sysMsg) + '&seed=' + Date.now();
    var polGetRes = await fetch(polGetUrl, { headers: { 'Accept': 'text/plain' } });
    if (polGetRes.ok) {
      var polGetText = (await polGetRes.text()).trim();
      if (polGetText && polGetText.length > 5) return polGetText;
    }
    errors.push('Pollinations GET: ' + polGetRes.status);
  } catch (e) { errors.push('Pollinations GET: ' + e.message); }

  // 5. OPENROUTER — free tier
  try {
    var orKey = process.env.OPENROUTER_API_KEY || '';
    var orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (orKey || 'sk-or-free'),
        'HTTP-Referer': 'https://jarvis-ai-seven-dun.vercel.app',
        'X-Title': 'HENRY'
      },
      body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages: messages, max_tokens: 1024 })
    });
    var orText = await orRes.text();
    var orData;
    try { orData = JSON.parse(orText); } catch (e) { orData = null; }
    if (orRes.ok && orData && orData.choices && orData.choices[0] && orData.choices[0].message)
      return orData.choices[0].message.content.trim();
    errors.push('OpenRouter: ' + orRes.status);
  } catch (e) { errors.push('OpenRouter: ' + e.message); }

  throw new Error('DAILY_LIMIT');
}
