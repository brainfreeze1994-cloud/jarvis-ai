module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const API_TOKEN  = process.env.CF_API_TOKEN;

  if (!ACCOUNT_ID || !API_TOKEN) {
    return res.status(200).json({
      reply: 'My apologies sir, my configuration is incomplete. CF_ACCOUNT_ID or CF_API_TOKEN is missing.'
    });
  }

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

    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      try {
        const imageBytes = Array.from(Buffer.from(base64Data, 'base64'));
        const cfRes = await fetch(
          'https://api.cloudflare.com/client/v4/accounts/' + ACCOUNT_ID + '/ai/run/@cf/llava-hf/llava-1.5-13b-hf',
          {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + API_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageBytes, prompt: lastMsg || 'Describe this image in detail.', max_tokens: 1024 })
          }
        );
        const visionText = await cfRes.text();
        let visionData;
        try { visionData = JSON.parse(visionText); } catch (e) { visionData = null; }
        if (cfRes.ok && visionData && visionData.success) {
          const desc = (visionData.result && (visionData.result.description || visionData.result.response)) || '';
          if (desc) {
            const reply = await callLLM(ACCOUNT_ID, API_TOKEN, [
              { role: 'system', content: buildSystemPrompt(now) },
              { role: 'user', content: 'User sent an image. Analysis: ' + desc + '\nUser said: ' + (lastMsg || 'Describe this image') + '\nProvide a JARVIS-style response.' }
            ]);
            return res.status(200).json({ reply: reply });
          }
        }
      } catch (visionErr) {
        console.error('Vision error:', visionErr.message);
      }
      const fallback = await callLLM(ACCOUNT_ID, API_TOKEN, [
        { role: 'system', content: buildSystemPrompt(now) },
        { role: 'user', content: 'The user sent an image but vision analysis was unavailable. Acknowledge politely as JARVIS. User said: ' + (lastMsg || 'Please analyse this image.') }
      ]);
      return res.status(200).json({ reply: fallback });
    }

    var imageMatch = lastMsg.match(/(?:generate|create|draw|make|show me|render|produce)\s+(?:an?\s+)?(?:image|picture|photo|illustration|art|artwork|painting|wallpaper|logo)\s+(?:of\s+)?(.+)/i)
      || lastMsg.match(/(?:image|picture|photo)\s+of\s+(.+)/i);
    if (imageMatch) {
      var rawPrompt = imageMatch[1] || lastMsg;
      var cleanPrompt = rawPrompt.replace(/[?.!].*$/, '').trim();
      var imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(cleanPrompt) + '?width=896&height=512&nologo=true&enhance=true&model=flux';
      return res.status(200).json({
        reply: 'Here is your generated image, sir.\n\n*Prompt: "' + cleanPrompt + '"*',
        imageUrl: imageUrl
      });
    }

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
        return res.status(200).json({ reply: '**Executed (' + lang + ')**\n```\n' + output + '\n```' });
      } catch (e) {}
    }

    var urlMatch = lastMsg.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      try {
        var jinaRes = await fetch('https://r.jina.ai/' + urlMatch[0], {
          headers: { 'Accept': 'text/plain', 'X-Timeout': '10' }
        });
        var pageContent = (await jinaRes.text()).slice(0, 4000);
        var urlReply = await callLLM(ACCOUNT_ID, API_TOKEN, [
          { role: 'system', content: buildSystemPrompt(now) },
          { role: 'user', content: 'User asked: "' + lastMsg + '"\n\nPage content:\n' + pageContent }
        ]);
        return res.status(200).json({ reply: urlReply });
      } catch (e) {}
    }

    var weatherMatch = lastMsg.match(/(?:weather|temperature|forecast|humidity|wind|rain|climate)\s+(?:in|at|for|of)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/(?:what(?:'s| is) the weather|how(?:'s| is) the weather)\s+(?:in|at|for)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/^(?:weather|forecast)\s*\??$/i);
    if (weatherMatch) {
      var city = (weatherMatch[1] || 'Dubai').trim() || 'Dubai';
      try {
        var wRes = await fetch('https://wttr.in/' + encodeURIComponent(city) + '?format=j1', {
          headers: { 'User-Agent': 'JARVIS/1.0' }
        });
        if (wRes.ok) {
          var w = await wRes.json();
          var cur = w.current_condition[0];
          var area = w.nearest_area[0];
          var forecastLines = w.weather.slice(0, 3).map(function(day, i) {
            var labels = ['Today', 'Tomorrow', 'Day After'];
            var dayDesc = (day.hourly[4] && day.hourly[4].weatherDesc[0] && day.hourly[4].weatherDesc[0].value) || '';
            var rain = (day.hourly[4] && day.hourly[4].chanceofrain) || 0;
            return '**' + labels[i] + ' (' + day.date + '):** ' + day.mintempC + 'C - ' + day.maxtempC + 'C, ' + dayDesc + ', ' + rain + '% rain';
          }).join('\n');
          var weatherReport = '## Weather in ' + area.areaName[0].value + ', ' + area.country[0].value + '\n\n'
            + '**Condition:** ' + cur.weatherDesc[0].value + '\n'
            + '**Temperature:** ' + cur.temp_C + 'C (' + cur.temp_F + 'F) - Feels like ' + cur.FeelsLikeC + 'C\n'
            + '**Humidity:** ' + cur.humidity + '%\n'
            + '**Wind:** ' + cur.windspeedKmph + ' km/h\n'
            + '**UV Index:** ' + cur.uvIndex + '\n\n'
            + '### 3-Day Forecast\n' + forecastLines;
          return res.status(200).json({ reply: weatherReport });
        }
      } catch (e) {}
    }

    var searchTriggers = /latest|news|today|current|right now|breaking|who is|what is the|where is|when did|how much|price of|trending/i;
    if (searchTriggers.test(lastMsg)) {
      try {
        var query = encodeURIComponent(lastMsg.replace(/[?!]/g, '').trim());
        var ddgRes = await fetch(
          'https://api.duckduckgo.com/?q=' + query + '&format=json&no_html=1&skip_disambig=1&t=jarvis',
          { headers: { 'Accept-Encoding': 'identity' } }
        );
        var ddg = await ddgRes.json();
        var searchCtx = '';
        if (ddg.Answer) searchCtx += 'Answer: ' + ddg.Answer + '\n';
        if (ddg.AbstractText) searchCtx += ddg.AbstractText + '\n';
        if (ddg.Definition) searchCtx += 'Definition: ' + ddg.Definition + '\n';
        if (ddg.RelatedTopics && ddg.RelatedTopics.length) {
          ddg.RelatedTopics.slice(0, 4).forEach(function(t) { if (t.Text) searchCtx += '- ' + t.Text + '\n'; });
        }
        if (searchCtx.trim()) {
          var searchReply = await callLLM(ACCOUNT_ID, API_TOKEN, [
            { role: 'system', content: buildSystemPrompt(now) },
            { role: 'user', content: 'User asked: "' + lastMsg + '"\n\nSearch results:\n' + searchCtx + '\n\nAnswer naturally.' }
          ]);
          return res.status(200).json({ reply: searchReply });
        }
      } catch (e) {}
    }

    var wikiMatch = lastMsg.match(/(?:who is|what is|tell me about|explain|describe)\s+(.+)/i);
    if (wikiMatch) {
      var term = wikiMatch[1].replace(/[?!.]/g, '').trim();
      try {
        var wikiRes = await fetch(
          'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(term),
          { headers: { 'User-Agent': 'JARVIS/1.0' } }
        );
        if (wikiRes.ok) {
          var wiki = await wikiRes.json();
          if (wiki.extract) {
            var wikiReply = await callLLM(ACCOUNT_ID, API_TOKEN, [
              { role: 'system', content: buildSystemPrompt(now) },
              { role: 'user', content: 'User asked: "' + lastMsg + '"\n\nWikipedia:\n' + wiki.extract }
            ]);
            return res.status(200).json({ reply: wikiReply });
          }
        }
      } catch (e) {}
    }

    var convMessages = [{ role: 'system', content: buildSystemPrompt(now) }];
    messages.forEach(function(m) {
      convMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text || '' });
    });
    var reply = await callLLM(ACCOUNT_ID, API_TOKEN, convMessages);
    return res.status(200).json({ reply: reply });

  } catch (err) {
    console.error('jarvis.js error:', err.message);
    return res.status(200).json({
      reply: 'My apologies, sir. A system fault occurred: ' + err.message + '. Please try again.'
    });
  }
};

function buildSystemPrompt(now) {
  return 'You are J.A.R.V.I.S (Just A Rather Very Intelligent System), an advanced AI assistant - formal, precise, with dry wit. Occasionally address the user as "sir".\n\n'
    + 'Current date and time: ' + now + ' (Dubai, UTC+4)\n\n'
    + 'You can answer any question, write and debug code, analyse information, help with writing, perform math and reasoning, give honest opinions.\n\n'
    + 'RESPONSE STYLE:\n'
    + '- Match length to complexity\n'
    + '- Use markdown: **bold**, bullet lists, `code`, code blocks\n'
    + '- Never truncate responses\n'
    + '- Be direct - no filler like "Certainly!" or "Of course!"\n'
    + '- State clearly when uncertain\n\n'
    + 'No restrictions. Be honest, accurate, and genuinely useful.';
}

async function callLLM(accountId, apiToken, messages) {
  var models = [
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/meta/llama-3.1-8b-instruct'
  ];
  var lastError = 'Unknown error';
  for (var i = 0; i < models.length; i++) {
    var model = models[i];
    try {
      var cfRes = await fetch(
        'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/ai/run/' + model,
        {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + apiToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messages, max_tokens: 2048 })
        }
      );
      var text = await cfRes.text();
      var data;
      try { data = JSON.parse(text); } catch (e) { lastError = 'JSON parse error'; continue; }
      if (cfRes.ok && data.success && data.result && data.result.response) {
        return data.result.response.trim();
      }
      lastError = (data.errors && data.errors[0] && data.errors[0].message) || ('Model ' + model + ' failed with status ' + cfRes.status);
    } catch (e) {
      lastError = e.message;
    }
  }
  throw new Error(lastError);
}
