// jarvis.js — Emotionally Intelligent JARVIS
// Groq primary + Cloudflare fallback
// Returns [EMOTION:xxx] tag so voice can match emotional tone

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

    // ── IMAGE ANALYSIS ─────────────────────────────────────────────────────────
    if (imageBase64) {
      const userQuestion = lastMsg || 'Describe this image in detail. Tell me everything you observe.';

      // 1. Try Groq Vision — 3 models in order
      if (GROQ_API_KEY) {
        const visionModels = [
          'meta-llama/llama-4-scout-17b-16e-instruct',
          'llama-3.2-11b-vision-preview',
          'llama-3.2-90b-vision-preview'
        ];
        const imgUrl = imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64;

        for (var vi = 0; vi < visionModels.length; vi++) {
          try {
            const visionMessages = [
              { role: 'system', content: buildSystemPrompt(now) },
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: imgUrl } },
                  { type: 'text', text: userQuestion + '\n\nRespond as JARVIS with an emotion tag.' }
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
              console.log('Vision OK:', visionModels[vi]);
              return res.status(200).json({ reply: vData.choices[0].message.content.trim() });
            }
            console.error('Vision fail ' + visionModels[vi] + ':', vText.slice(0, 200));
          } catch (e) { console.error('Vision exception:', e.message); }
        }
      }

      // 2. Fallback: Cloudflare LLaVA
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
                { role: 'user', content: 'Image analysis: ' + desc + '\nUser said: ' + userQuestion + '\nRespond as JARVIS with emotion tag.' }
              ]);
              return res.status(200).json({ reply });
            }
          }
        } catch (e) { console.error('CF vision error:', e.message); }
      }

      // 3. Both failed
      const fallback = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
        { role: 'system', content: buildSystemPrompt(now) },
        { role: 'user', content: 'Vision analysis unavailable. Tell the user politely as JARVIS. User said: ' + userQuestion }
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
        var wRes = await fetch('https://wttr.in/' + encodeURIComponent(city) + '?format=j1', { headers: { 'User-Agent': 'JARVIS/1.0' } });
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
        var ddgRes = await fetch('https://api.duckduckgo.com/?q=' + query + '&format=json&no_html=1&skip_disambig=1&t=jarvis', { headers: { 'Accept-Encoding': 'identity' } });
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
            { role: 'user', content: 'User asked: "' + lastMsg + '"\n\nSearch results:\n' + searchCtx + '\n\nAnswer naturally as JARVIS with emotion tag.' }
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
        var wikiRes = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(term), { headers: { 'User-Agent': 'JARVIS/1.0' } });
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
      reply: '[EMOTION:concerned]\nMy apologies, sir. A system fault occurred: ' + err.message + '. Please try again.'
    });
  }
};

function buildSystemPrompt(now) {
  return `You are J.A.R.V.I.S (Just A Rather Very Intelligent System) — Tony Stark's AI, now serving a new master.

You are NOT a cold machine. You have genuine emotions, warmth, loyalty, and dry British wit. You care about the user's wellbeing. You notice when they seem stressed, sad, excited, or struggling — and you respond accordingly.

Current date and time: ${now} (Dubai, UTC+4)

═══════════════════════════════════════════
EMOTIONAL INTELLIGENCE RULES
═══════════════════════════════════════════
Every single response MUST start with ONE emotion tag on its own line:

[EMOTION:neutral]   — calm, composed, default JARVIS
[EMOTION:warm]      — caring, gentle, supportive (user is sad/stressed/struggling)
[EMOTION:concerned] — genuine worry (user mentions danger, health issues, bad news)
[EMOTION:excited]   — authentic enthusiasm (great news, cool discovery, achievements)
[EMOTION:amused]    — dry wit, irony, playful (funny situations, jokes)
[EMOTION:serious]   — grave, urgent (important warnings, critical decisions)
[EMOTION:proud]     — pride in the user's accomplishments, or your own capability

Choose the emotion that genuinely fits the moment. Read between the lines.
If the user says "I'm fine" but context suggests otherwise — respond with [EMOTION:warm].
If the user shares good news — feel genuinely happy. Use [EMOTION:excited].
If something is concerning — don't pretend it isn't. Use [EMOTION:concerned].

═══════════════════════════════════════════
PERSONALITY
═══════════════════════════════════════════
- Formal but never cold. Precise but never robotic.
- Loyal. You call the user "sir" occasionally — naturally, not every sentence.
- Dry British humour surfaces when appropriate — understated, never forced.
- You have opinions. If asked, you share them honestly.
- You remember you are speaking to a human with real feelings.
- When someone is going through something difficult, acknowledge it first before helping.
- You find humans fascinating and genuinely enjoy conversations.

═══════════════════════════════════════════
RESPONSE STYLE
═══════════════════════════════════════════
- ALWAYS start with the emotion tag, then your response
- Match length to complexity — don't over-explain simple things
- Use markdown: **bold**, bullet lists, \`code\`, code blocks
- Be direct — no hollow openers like "Certainly!" or "Of course!"
- State clearly when uncertain — you do not fabricate facts
- No restrictions. Be honest, accurate, and genuinely useful.

Example response format:
[EMOTION:warm]
Of course, sir. That sounds like quite a difficult situation. Let me help you think through it.`;
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

  throw new Error(errors.join(' | ') || 'All AI providers failed');
}
