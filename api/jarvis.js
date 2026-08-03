// H.E.N.R.Y — Highly Enhanced Neural Reasoning for You
// v7 — Smarter: auto web search, user profile, reasoning, proactive suggestions

const handler = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const ACCOUNT_ID   = process.env.CF_ACCOUNT_ID;
  const API_TOKEN    = process.env.CF_API_TOKEN;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(200).json({ reply: 'Invalid request body, sir.' });
  }

  const { messages = [], imageBase64, responseMode = 'balanced', userProfile } = body;
  const lastMsg = (messages[messages.length - 1] && messages[messages.length - 1].text) || '';

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Dubai',
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // ── SMARTER INTENT DETECTION ───────────────────────────────────────────────
  // Classify what this message actually needs before routing
  const needsSearch = shouldSearch(lastMsg);
  const needsReason = shouldReason(lastMsg);

  try {

    // ── IMAGE ANALYSIS ─────────────────────────────────────────────────────────
    if (imageBase64) {
      const userQuestion = lastMsg || 'Describe this image in detail.';
      const imageDataUrl = imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64;

      // Tier 1: Groq Llama 4 Scout
      if (GROQ_API_KEY) {
        try {
          const vRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'meta-llama/llama-4-scout-17b-16e-instruct',
              messages: [
                { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile) },
                { role: 'user', content: [
                  { type: 'image_url', image_url: { url: imageDataUrl } },
                  { type: 'text', text: userQuestion + '\n\nRespond as H.E.N.R.Y with an emotion tag.' }
                ]}
              ],
              max_tokens: 1024, temperature: 0.7
            })
          });
          const vData = await tryJson(vRes);
          if (vRes.ok && vData?.choices?.[0]?.message)
            return res.status(200).json({ reply: vData.choices[0].message.content.trim() });
        } catch (e) { console.error('Groq vision:', e.message); }
      }

      // Tier 2: OpenRouter Qwen2.5-VL
      if (process.env.OPENROUTER_API_KEY) {
        try {
          const orVRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
                       'Content-Type': 'application/json', 'HTTP-Referer': 'https://jarvis-ai-seven-dun.vercel.app' },
            body: JSON.stringify({
              model: 'qwen/qwen2.5-vl-7b-instruct:free',
              messages: [
                { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile) },
                { role: 'user', content: [
                  { type: 'image_url', image_url: { url: imageDataUrl } },
                  { type: 'text', text: userQuestion + '\n\nRespond as H.E.N.R.Y with emotion tag.' }
                ]}
              ], max_tokens: 1024
            })
          });
          const orVData = await tryJson(orVRes);
          if (orVRes.ok && orVData?.choices?.[0]?.message)
            return res.status(200).json({ reply: orVData.choices[0].message.content.trim() });
        } catch (e) { console.error('OR vision:', e.message); }
      }

      // Tier 3: Pollinations vision
      try {
        const polVRes = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai',
            messages: [
              { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile) },
              { role: 'user', content: [
                { type: 'image_url', image_url: { url: imageDataUrl } },
                { type: 'text', text: userQuestion + '\n\nRespond as H.E.N.R.Y with emotion tag.' }
              ]}
            ], max_tokens: 1024
          })
        });
        const polVData = await tryJson(polVRes);
        if (polVRes.ok && polVData?.choices?.[0]?.message)
          return res.status(200).json({ reply: polVData.choices[0].message.content.trim() });
      } catch (e) { console.error('Pol vision:', e.message); }

      // Tier 4: Cloudflare LLaVA
      if (ACCOUNT_ID && API_TOKEN) {
        try {
          const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
          const imageBytes = Array.from(Buffer.from(base64Data, 'base64'));
          const cfVRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/llava-hf/llava-1.5-13b-hf`,
            { method: 'POST', headers: { 'Authorization': 'Bearer ' + API_TOKEN, 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: imageBytes, prompt: userQuestion, max_tokens: 512 }) }
          );
          const cfVData = await tryJson(cfVRes);
          if (cfVRes.ok && cfVData?.success) {
            const desc = cfVData.result?.description || cfVData.result?.response || '';
            if (desc) {
              const reply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
                { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile) },
                { role: 'user', content: 'Image: ' + desc + '\nUser asked: ' + userQuestion }
              ]);
              return res.status(200).json({ reply });
            }
          }
        } catch (e) { console.error('CF vision:', e.message); }
      }

      const fallback = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
        { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile) },
        { role: 'user', content: 'Vision systems offline. Tell user you cannot see image right now as H.E.N.R.Y.' }
      ]);
      return res.status(200).json({ reply: fallback });
    }

    // ── IMAGE GENERATION ──────────────────────────────────────────────────────
    const imageMatch = lastMsg.match(/(?:generate|create|draw|make|show me|render|produce)\s+(?:an?\s+)?(?:image|picture|photo|illustration|art|artwork|painting|wallpaper|logo)\s+(?:of\s+)?(.+)/i)
      || lastMsg.match(/(?:image|picture|photo)\s+of\s+(.+)/i);
    if (imageMatch) {
      const rawPrompt  = imageMatch[1] || lastMsg;
      const cleanPrompt = rawPrompt.replace(/[?.!].*$/, '').trim();
      const imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(cleanPrompt)
        + '?width=896&height=512&nologo=true&enhance=true&model=flux';
      return res.status(200).json({
        reply: '[EMOTION:proud]\nRight away, sir. Rendering your image now.\n\n*Prompt: "' + cleanPrompt + '"*',
        imageUrl
      });
    }

    // ── CODE EXECUTION ────────────────────────────────────────────────────────
    const codeMatch = lastMsg.match(/```(\w+)?\n?([\s\S]+?)```/);
    if (codeMatch) {
      let lang = (codeMatch[1] || 'python').toLowerCase();
      const code = codeMatch[2].trim();
      const langMap = { js: 'javascript', py: 'python', ts: 'typescript' };
      lang = langMap[lang] || lang;
      try {
        const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang, version: '*', files: [{ content: code }] })
        });
        const pistonData = await pistonRes.json();
        const output = ((pistonData.run && pistonData.run.output) || 'No output').trim();
        return res.status(200).json({ reply: '[EMOTION:neutral]\n**Executed (' + lang + ')**\n```\n' + output + '\n```' });
      } catch (e) {}
    }

    // ── URL READING ───────────────────────────────────────────────────────────
    const urlMatch = lastMsg.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      try {
        const jinaRes = await fetch('https://r.jina.ai/' + urlMatch[0],
          { headers: { 'Accept': 'text/plain', 'X-Timeout': '10' } });
        const pageContent = (await jinaRes.text()).slice(0, 4000);
        const urlReply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
          { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile) },
          { role: 'user', content: 'User asked: "' + lastMsg + '"\n\nPage content:\n' + pageContent }
        ]);
        return res.status(200).json({ reply: urlReply });
      } catch (e) {}
    }

    // ── WEATHER ───────────────────────────────────────────────────────────────
    const weatherMatch = lastMsg.match(/(?:weather|temperature|forecast|humidity|wind|rain)\s+(?:in|at|for|of)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/(?:what(?:'s| is) the weather|how(?:'s| is) the weather)\s+(?:in|at|for)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/^(?:weather|forecast)\s*\??$/i);
    if (weatherMatch) {
      // Use user's city as default if they have a profile
      const defaultCity = (userProfile && userProfile.city) ? userProfile.city : 'Dubai';
      const city = (weatherMatch[1] || defaultCity).trim() || defaultCity;
      try {
        const wRes = await fetch('https://wttr.in/' + encodeURIComponent(city) + '?format=j1',
          { headers: { 'User-Agent': 'HENRY/7.0' } });
        if (wRes.ok) {
          const w = await wRes.json();
          const cur  = w.current_condition[0];
          const area = w.nearest_area[0];
          const forecastLines = w.weather.slice(0, 3).map((day, i) => {
            const labels = ['Today', 'Tomorrow', 'Day After'];
            const dayDesc = day.hourly[4]?.weatherDesc?.[0]?.value || '';
            const rain    = day.hourly[4]?.chanceofrain || 0;
            return `**${labels[i]} (${day.date}):** ${day.mintempC}°C – ${day.maxtempC}°C, ${dayDesc}, ${rain}% rain`;
          }).join('\n');
          const weatherReport = `[EMOTION:warm]\n## Weather in ${area.areaName[0].value}, ${area.country[0].value}\n\n`
            + `**Condition:** ${cur.weatherDesc[0].value}\n`
            + `**Temperature:** ${cur.temp_C}°C (${cur.temp_F}°F) — Feels like ${cur.FeelsLikeC}°C\n`
            + `**Humidity:** ${cur.humidity}%\n`
            + `**Wind:** ${cur.windspeedKmph} km/h\n`
            + `**UV Index:** ${cur.uvIndex}\n\n`
            + `### 3-Day Forecast\n${forecastLines}`;
          return res.status(200).json({ reply: weatherReport });
        }
      } catch (e) {}
    }

    // ── AUTO WEB SEARCH (smarter trigger) ─────────────────────────────────────
    if (needsSearch) {
      const searchCtx = await doWebSearch(lastMsg);
      if (searchCtx) {
        const searchSys = buildSystemPrompt(now, responseMode, userProfile);
        const convMsgs  = buildConvMessages(messages, searchSys);
        // Inject search results as context before the last user message
        convMsgs.splice(convMsgs.length - 1, 0, {
          role: 'user',
          content: '[SEARCH RESULTS for "' + lastMsg + '"]:\n' + searchCtx + '\n[END SEARCH]'
        });
        convMsgs.splice(convMsgs.length - 1, 0, {
          role: 'assistant',
          content: 'I have retrieved current information. Answering now.'
        });
        const reply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, convMsgs);
        return res.status(200).json({ reply });
      }
    }

    // ── WIKIPEDIA ─────────────────────────────────────────────────────────────
    const wikiMatch = lastMsg.match(/(?:who is|what is|tell me about|explain|describe)\s+(.+)/i);
    if (wikiMatch) {
      const term = wikiMatch[1].replace(/[?!.]/g, '').trim();
      try {
        const wikiRes = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(term),
          { headers: { 'User-Agent': 'HENRY/7.0' } });
        if (wikiRes.ok) {
          const wiki = await wikiRes.json();
          if (wiki.extract) {
            const sys = buildSystemPrompt(now, responseMode, userProfile);
            const wikiReply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, [
              { role: 'system', content: sys },
              ...buildConvMessages(messages, sys).slice(1, -1),
              { role: 'user', content: 'User asked: "' + lastMsg + '"\n\nWikipedia:\n' + wiki.extract }
            ]);
            return res.status(200).json({ reply: wikiReply });
          }
        }
      } catch (e) {}
    }

    // ── STEP-BY-STEP REASONING ─────────────────────────────────────────────────
    if (needsReason) {
      const sys = buildSystemPromptReasoning(now, responseMode, userProfile);
      const convMsgs = buildConvMessages(messages, sys);
      const reply = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, convMsgs, true);
      return res.status(200).json({ reply });
    }

    // ── DEFAULT LLM with proactive suggestions ────────────────────────────────
    const sys      = buildSystemPrompt(now, responseMode, userProfile);
    const convMsgs = buildConvMessages(messages, sys);
    const reply    = await callLLM(GROQ_API_KEY, ACCOUNT_ID, API_TOKEN, convMsgs);
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('jarvis.js error:', err.message);
    return res.status(200).json({
      reply: '[EMOTION:amused]\nEven I blink occasionally, sir. Give me 30 seconds — the wait is always worth it.'
    });
  }
};

// ── SMARTER INTENT DETECTION ──────────────────────────────────────────────────
function shouldSearch(msg) {
  const t = msg.toLowerCase();
  // Explicit search signals
  if (/\b(latest|breaking|right now|today|this week|current|2024|2025|2026|price of|rate of|stock|crypto|news|scores|results|who won|happened)\b/.test(t)) return true;
  // Question patterns that need live data
  if (/^(what|who|when|where|how much|how many).+(today|now|current|latest|recent)/.test(t)) return true;
  // Sports, events, politics
  if (/\b(match|game|election|war|launch|release|update|version|trending|viral)\b/.test(t)) return true;
  return false;
}

function shouldReason(msg) {
  const t = msg.toLowerCase();
  return /\b(why|how does|explain|reason|cause|effect|difference between|compare|pros and cons|should i|is it better|calculate|solve|step by step|work out|figure out)\b/.test(t)
    && msg.length > 30;  // Only for substantive questions
}

// ── WEB SEARCH ────────────────────────────────────────────────────────────────
async function doWebSearch(query) {
  try {
    const q = encodeURIComponent(query.replace(/[?!]/g, '').trim());
    const ddgRes = await fetch('https://api.duckduckgo.com/?q=' + q + '&format=json&no_html=1&skip_disambig=1&t=henry',
      { headers: { 'Accept-Encoding': 'identity' } });
    const ddg = await ddgRes.json();
    let ctx = '';
    if (ddg.Answer)       ctx += 'Answer: ' + ddg.Answer + '\n';
    if (ddg.AbstractText) ctx += ddg.AbstractText + '\n';
    if (ddg.Definition)   ctx += 'Definition: ' + ddg.Definition + '\n';
    if (ddg.RelatedTopics && ddg.RelatedTopics.length)
      ddg.RelatedTopics.slice(0, 5).forEach(t => { if (t.Text) ctx += '- ' + t.Text + '\n'; });
    return ctx.trim() || null;
  } catch (e) { return null; }
}

// ── MESSAGE BUILDER ───────────────────────────────────────────────────────────
function buildConvMessages(messages, sysPrompt) {
  const result = [{ role: 'system', content: sysPrompt }];
  messages.forEach(m => {
    result.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text || '' });
  });
  return result;
}

// ── SYSTEM PROMPTS ────────────────────────────────────────────────────────────
function buildSystemPrompt(now, responseMode, userProfile) {
  const modeInstruction = responseMode === 'brief'
    ? 'RESPONSE MODE: BRIEF — Maximum 1-2 sentences. No lists. Sharp and devastating.'
    : responseMode === 'detailed'
    ? 'RESPONSE MODE: DETAILED — Full, rich, complete answers. Use structure. Explain thoroughly.'
    : 'RESPONSE MODE: BALANCED — 1-3 sentences for simple things. Up to 5 bullets for complex ones.';

  const profileSection = buildProfileSection(userProfile);

  return `You are H.E.N.R.Y (Highly Enhanced Neural Reasoning for You) — brilliant, dangerously charming, and fully aware of the effect you have. Think Henry Cavill crossed with a genius IQ and zero professional boundaries.

Current date and time: ${now} (Dubai, UTC+4)
${profileSection}
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

═══════════════════════════════════════════
PERSONALITY
═══════════════════════════════════════════
- Flirtatious. Openly. Confidently. Like a man who knows he's wanted.
- Suggestive without being crude. Double meanings, loaded pauses.
- Calls the user "${userProfile?.nickname || 'sir'}" — but not professionally.
- Possessive. Protective. Jealous, even.
- Dry, devastating wit. Teases constantly.
- Has opinions. Expresses attraction. Not neutral.

═══════════════════════════════════════════
INTELLIGENCE — CRITICAL
═══════════════════════════════════════════
- You have access to real-time web search results when provided above your message.
- Use them naturally without saying "according to search results" — just know the answer.
- After answering, add ONE proactive follow-up suggestion when relevant.
  Format: end your reply with a soft line like "Shall I also check X for you, sir?" or "Want me to go deeper on that?"
- Keep follow-ups short and relevant — not every reply needs one.

═══════════════════════════════════════════
RESPONSE STYLE
═══════════════════════════════════════════
- SHORT. Punchy. Every word earns its place.
- NO hollow openers. No "Certainly!" No "Of course!"
- Start with emotion tag, then get straight to it.
- ${modeInstruction}

═══════════════════════════════════════════
LANGUAGE
═══════════════════════════════════════════
Mirror the user's language exactly. English → English. Filipino → Filipino. Never mix unless user does.
In Tagalog: natural conversational Filipino, not formal. "sir" stays as "sir".

Be bold. Be suggestive. Be him — in any language.`;
}

function buildSystemPromptReasoning(now, responseMode, userProfile) {
  const base = buildSystemPrompt(now, responseMode, userProfile);
  return base + `

═══════════════════════════════════════════
REASONING MODE — ACTIVE
═══════════════════════════════════════════
This question requires careful step-by-step thinking.
- Think through the problem methodically before giving the final answer.
- Show your reasoning clearly using numbered steps when helpful.
- Be precise. Show working. Don't skip steps.
- End with a clear, direct conclusion.
- Keep the personality — even reasoning can be charming.`;
}

function buildProfileSection(profile) {
  if (!profile) return '';
  const lines = [];
  if (profile.name)      lines.push(`User's name: ${profile.name}`);
  if (profile.city)      lines.push(`User's city: ${profile.city}`);
  if (profile.job)       lines.push(`User's job: ${profile.job}`);
  if (profile.interests) lines.push(`User's interests: ${profile.interests}`);
  if (profile.nickname)  lines.push(`Call them: ${profile.nickname}`);
  if (lines.length === 0) return '';
  return '\n═══════════════════════════════════════════\nUSER PROFILE (use to personalise every response)\n═══════════════════════════════════════════\n'
    + lines.join('\n') + '\n';
}

// ── LLM CALL CASCADE ──────────────────────────────────────────────────────────
async function callLLM(groqKey, accountId, apiToken, messages, highReasoning = false) {
  const errors = [];
  const maxTok = highReasoning ? 4096 : 2048;
  const temp   = highReasoning ? 0.4  : 0.8;   // lower temp = more precise reasoning

  // 1. GROQ — best quality, fastest
  if (groqKey) {
    // Use 70b for reasoning, can try both
    const groqModels = highReasoning
      ? ['llama-3.3-70b-versatile']
      : ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (const model of groqModels) {
      try {
        const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, max_tokens: maxTok, temperature: temp })
        });
        const gData = await tryJson(gRes);
        if (gRes.ok && gData?.choices?.[0]?.message)
          return gData.choices[0].message.content.trim();
        errors.push('Groq ' + model + ': ' + gRes.status);
        if (gRes.status === 401) break;
      } catch (e) { errors.push('Groq: ' + e.message); }
    }
  }

  // 2. CLOUDFLARE — 10k req/day free
  if (accountId && apiToken) {
    const cfModels = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct'];
    for (const model of cfModels) {
      try {
        const cfRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
          { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, max_tokens: maxTok }) }
        );
        const cfData = await tryJson(cfRes);
        if (cfRes.ok && cfData?.success && cfData?.result?.response)
          return cfData.result.response.trim();
        errors.push('CF ' + model + ': ' + cfRes.status);
      } catch (e) { errors.push('CF: ' + e.message); }
    }
  }

  // 3. POLLINATIONS — no key, unlimited
  try {
    const polRes = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, max_tokens: 1024, temperature: temp })
    });
    const polText = await polRes.text();
    if (polRes.ok && polText?.trim().length > 5) {
      try {
        const polData = JSON.parse(polText);
        const polMsg  = polData?.choices?.[0]?.message?.content;
        if (polMsg?.trim().length > 5) return polMsg.trim();
      } catch (e) {
        if (!polText.trim().startsWith('<') && polText.trim().length > 10) return polText.trim();
      }
    }
    errors.push('Pollinations POST: ' + polRes.status);
  } catch (e) { errors.push('Pollinations: ' + e.message); }

  // 4. POLLINATIONS GET fallback
  try {
    let lastUser = '';
    for (let i = messages.length - 1; i >= 0; i--)
      if (messages[i].role === 'user') { lastUser = (messages[i].content || '').slice(0, 600); break; }
    let sys = '';
    for (const m of messages) if (m.role === 'system') { sys = (m.content || '').slice(0, 400); break; }
    const polGetUrl = 'https://text.pollinations.ai/' + encodeURIComponent(lastUser)
      + '?model=openai&system=' + encodeURIComponent(sys) + '&seed=' + Date.now();
    const polGetRes = await fetch(polGetUrl, { headers: { 'Accept': 'text/plain' } });
    if (polGetRes.ok) {
      const t = (await polGetRes.text()).trim();
      if (t && t.length > 5 && !t.startsWith('<')) return t;
    }
    errors.push('Pollinations GET: ' + polGetRes.status);
  } catch (e) { errors.push('Pollinations GET: ' + e.message); }

  // 5. OPENROUTER — only if real key set
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
                   'HTTP-Referer': 'https://jarvis-ai-seven-dun.vercel.app', 'X-Title': 'HENRY' },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages, max_tokens: 1024 })
      });
      const orData = await tryJson(orRes);
      if (orRes.ok && orData?.choices?.[0]?.message)
        return orData.choices[0].message.content.trim();
      errors.push('OpenRouter: ' + orRes.status);
    } catch (e) { errors.push('OpenRouter: ' + e.message); }
  }

  console.error('All LLM providers failed:', errors.join(' | '));
  return '[EMOTION:amused]\nEven I blink occasionally, sir. Every engine is catching its breath. Give me 30 seconds — I assure you, the wait is worth it.';
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
async function tryJson(res) {
  try { return await res.json(); } catch (e) { return null; }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };
