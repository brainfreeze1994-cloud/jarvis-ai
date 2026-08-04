// ============================================================
// H·E·N·R·Y™ — Hyperintelligence Engine Neural Reasoning Yield
// © 2026 H·E·N·R·Y Project. All rights reserved.
// Unauthorized use, reproduction, or distribution is prohibited.
// ============================================================
// H.E.N.R.Y — Hyperintelligence Engine Neural Reasoning Yield
// v20 — ULTIMATE: Emotion Detection, Moods, UAE Law, Dubai Transit,
//        Multi-Model Tournament, Chain Thinking, Relationship Brain

const handler = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_KEY   = process.env.GROQ_API_KEY;
  const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const API_TOKEN  = process.env.CF_API_TOKEN;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(200).json({ reply: 'Invalid request body, sir.' });
  }

  const {
    messages         = [],
    imageBase64,
    responseMode     = 'balanced',
    userProfile,
    queryType,
    memoryFacts      = [],
    emotionState,          // client-detected emotional state
    relationshipContext,   // serialized relationship facts
    enableTournament,      // client requests multi-model tournament
    enableChainThinking    // client requests visible chain thinking
  } = body;

  const lastMsg   = messages[messages.length - 1]?.text || '';
  const emotion   = detectEmotionalState(lastMsg, emotionState);
  const mood      = getHenryMood();
  const intent    = classifyIntent(lastMsg, queryType);
  const isLegal   = detectLegalQuery(lastMsg);
  const isTransit = detectTransitQuery(lastMsg);

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Dubai', weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  try {

    // ══════════════════════════════════════════════════════
    // IMAGE ANALYSIS
    // ══════════════════════════════════════════════════════
    if (imageBase64) {
      const q = lastMsg || 'Describe this image in detail.';
      const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64;
      const sys = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext);

      if (GROQ_KEY) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'meta-llama/llama-4-scout-17b-16e-instruct',
              messages: [{ role: 'system', content: sys },
                { role: 'user', content: [
                  { type: 'image_url', image_url: { url: dataUrl } },
                  { type: 'text', text: q + '\n\nRespond as H.E.N.R.Y with emotion tag.' }
                ]}],
              max_tokens: 1024, temperature: 0.7
            })
          });
          const d = await tryJson(r);
          if (r.ok && d?.choices?.[0]?.message)
            return res.status(200).json(parseResponse(d.choices[0].message.content.trim()));
        } catch (e) {}
      }
      if (process.env.OPENROUTER_API_KEY) {
        try {
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
                       'Content-Type': 'application/json',
                       'HTTP-Referer': 'https://jarvis-ai-seven-dun.vercel.app' },
            body: JSON.stringify({ model: 'qwen/qwen2.5-vl-7b-instruct:free',
              messages: [{ role: 'system', content: sys },
                { role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl } },
                  { type: 'text', text: q }]}], max_tokens: 1024 })
          });
          const d = await tryJson(r);
          if (r.ok && d?.choices?.[0]?.message)
            return res.status(200).json(parseResponse(d.choices[0].message.content.trim()));
        } catch (e) {}
      }
      const fb = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN,
        [{ role: 'system', content: sys }, { role: 'user', content: 'Tell user vision offline as H.E.N.R.Y.' }]);
      return res.status(200).json(parseResponse(fb));
    }

    // ══════════════════════════════════════════════════════
    // IMAGE GENERATION
    // ══════════════════════════════════════════════════════
    const imgMatch = lastMsg.match(/(?:generate|create|draw|make|show me|render|produce)\s+(?:an?\s+)?(?:image|picture|photo|illustration|art|artwork|painting|wallpaper|logo)\s+(?:of\s+)?(.+)/i)
      || lastMsg.match(/(?:image|picture|photo)\s+of\s+(.+)/i);
    if (imgMatch) {
      const prompt = imgMatch[1].replace(/[?.!].*$/, '').trim();
      const seed = Math.floor(Math.random() * 999999);

      // Primary: Cloudflare AI Stable Diffusion (returns binary PNG → base64)
      if (ACCOUNT_ID && API_TOKEN) {
        try {
          const r = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
            { method: 'POST',
              headers: { 'Authorization': 'Bearer ' + API_TOKEN, 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, num_steps: 20 }) }
          );
          if (r.ok) {
            const buf = await r.arrayBuffer();
            const b64 = Buffer.from(buf).toString('base64');
            return res.status(200).json({
              reply: '[EMOTION:proud]\nRight away, sir. Rendering your image now.\n\n*Prompt: "' + prompt + '"*',
              imageUrl: 'data:image/png;base64,' + b64,
              followUps: ['Generate a different style', 'Make it darker', 'Create a portrait version']
            });
          }
        } catch (e) {}
      }

      // Fallback: Pollinations (default model — no model param, most reliable)
      return res.status(200).json({
        reply: '[EMOTION:proud]\nRight away, sir. Rendering your image now.\n\n*Prompt: "' + prompt + '"*',
        imageUrl: 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt)
          + '?width=896&height=512&nologo=true&seed=' + seed,
        followUps: ['Generate a different style', 'Make it darker', 'Create a portrait version']
      });
    }

    // ══════════════════════════════════════════════════════
    // DUBAI TRANSIT ROUTING
    // ══════════════════════════════════════════════════════
    if (isTransit) {
      const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext)
        + '\n\n' + DUBAI_TRANSIT_SYSTEM;
      const conv = buildConvMessages(messages, sys, 15);
      // Use compound-beta for live accuracy
      if (GROQ_KEY) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'compound-beta', messages: conv, max_tokens: 1500, temperature: 0.5 })
          });
          const d = await tryJson(r);
          if (r.ok && d?.choices?.[0]?.message) {
            const raw = d.choices[0].message.content.trim();
            if (raw.length > 10) return res.status(200).json(parseResponse(raw));
          }
        } catch (e) {}
      }
      const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv);
      return res.status(200).json(parseResponse(reply));
    }

    // ══════════════════════════════════════════════════════
    // UAE LAW / ARGUMENT SHIELD
    // ══════════════════════════════════════════════════════
    if (isLegal) {
      const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext)
        + '\n\n' + UAE_LAW_SYSTEM;
      const conv = buildConvMessages(messages, sys, 15);
      if (GROQ_KEY) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'compound-beta', messages: conv, max_tokens: 2048, temperature: 0.4 })
          });
          const d = await tryJson(r);
          if (r.ok && d?.choices?.[0]?.message) {
            const raw = d.choices[0].message.content.trim();
            if (raw.length > 10) return res.status(200).json(parseResponse(raw));
          }
        } catch (e) {}
      }
      const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv, true);
      return res.status(200).json(parseResponse(reply));
    }

    // ══════════════════════════════════════════════════════
    // LIVE PRICES
    // ══════════════════════════════════════════════════════
    if (intent === 'crypto') {
      const data = await getCryptoPrices(lastMsg);
      if (data) {
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext);
        const conv = buildConvMessages(messages, sys, 10);
        conv.push({ role: 'user', content: 'Live crypto data:\n' + data + '\n\nUser asked: ' + lastMsg });
        return res.status(200).json(parseResponse(await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv)));
      }
    }
    if (intent === 'commodity') {
      const data = await getCommodityPrices();
      if (data) {
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext);
        const conv = buildConvMessages(messages, sys, 10);
        conv.push({ role: 'user', content: 'Live commodity prices:\n' + data + '\n\nUser asked: ' + lastMsg });
        return res.status(200).json(parseResponse(await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv)));
      }
    }
    if (intent === 'forex') {
      const data = await getForexRate(lastMsg);
      if (data) {
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext);
        const conv = buildConvMessages(messages, sys, 10);
        conv.push({ role: 'user', content: 'Live rate: ' + data + '\n\nUser asked: ' + lastMsg });
        return res.status(200).json(parseResponse(await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv)));
      }
    }
    if (intent === 'math') {
      const result = solveMath(lastMsg);
      if (result) {
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext);
        const conv = buildConvMessages(messages, sys, 10);
        conv.push({ role: 'user', content: 'Calculation: ' + result + '\n\nUser asked: ' + lastMsg });
        return res.status(200).json(parseResponse(await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv)));
      }
    }

    // ══════════════════════════════════════════════════════
    // CODE EXECUTION
    // ══════════════════════════════════════════════════════
    const codeMatch = lastMsg.match(/```(\w+)?\n?([\s\S]+?)```/);
    if (codeMatch) {
      let lang = (codeMatch[1] || 'python').toLowerCase();
      const code = codeMatch[2].trim();
      const lm = { js:'javascript', py:'python', ts:'typescript' };
      lang = lm[lang] || lang;
      try {
        const r = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang, version: '*', files: [{ content: code }] })
        });
        const d = await r.json();
        return res.status(200).json({
          reply: '[EMOTION:neutral]\n**Executed (' + lang + ')**\n```\n' + ((d.run?.output)||'No output').trim() + '\n```',
          followUps: ['Explain this code', 'Optimise it', 'Debug any issues']
        });
      } catch (e) {}
    }

    // ══════════════════════════════════════════════════════
    // URL READING
    // ══════════════════════════════════════════════════════
    const urlMatch = lastMsg.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      try {
        const r = await fetch('https://r.jina.ai/' + urlMatch[0],
          { headers: { 'Accept': 'text/plain', 'X-Timeout': '10' } });
        const content = (await r.text()).slice(0, 4000);
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext);
        const conv = buildConvMessages(messages, sys, 15);
        conv[conv.length-1].content = 'User asked: "'+lastMsg+'"\n\nPage:\n'+content;
        return res.status(200).json(parseResponse(await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv)));
      } catch (e) {}
    }

    // ══════════════════════════════════════════════════════
    // WEATHER
    // ══════════════════════════════════════════════════════
    const wxMatch = lastMsg.match(/(?:weather|temperature|forecast|humidity|wind|rain)\s+(?:in|at|for|of)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/(?:what(?:'s| is) the weather|how(?:'s| is) the weather)\s+(?:in|at|for)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/^(?:weather|forecast)\s*\??$/i);
    if (wxMatch) {
      const city = (wxMatch[1] || userProfile?.city || 'Dubai').trim() || 'Dubai';
      try {
        const r = await fetch('https://wttr.in/'+encodeURIComponent(city)+'?format=j1',
          { headers:{'User-Agent':'HENRY/20.0'} });
        if (r.ok) {
          const w = await r.json();
          const cur = w.current_condition[0], area = w.nearest_area[0];
          const days = w.weather.slice(0,3).map((d,i)=>{
            const lbl=['Today','Tomorrow','Day After'][i];
            return `**${lbl}:** ${d.mintempC}°C–${d.maxtempC}°C, ${d.hourly[4]?.weatherDesc?.[0]?.value||''}, ${d.hourly[4]?.chanceofrain||0}% rain`;
          }).join('\n');
          const report = `[EMOTION:warm]\n## Weather in ${area.areaName[0].value}, ${area.country[0].value}\n\n`
            +`**Now:** ${cur.weatherDesc[0].value}, ${cur.temp_C}°C (feels ${cur.FeelsLikeC}°C)\n`
            +`**Humidity:** ${cur.humidity}% · **Wind:** ${cur.windspeedKmph} km/h · **UV:** ${cur.uvIndex}\n\n`
            +`### Forecast\n${days}`;
          return res.status(200).json({ reply: report, followUps:['What to wear today?','Rain this week?','Check another city'] });
        }
      } catch (e) {}
    }

    // ══════════════════════════════════════════════════════
    // NEWS
    // ══════════════════════════════════════════════════════
    if (intent === 'news') {
      const headlines = await fetchNews(lastMsg);
      if (headlines) {
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext);
        const conv = buildConvMessages(messages, sys, 10);
        conv.push({ role:'user', content:'Headlines:\n'+headlines+'\n\nUser asked: '+lastMsg+'\n\nSummarise as H.E.N.R.Y.' });
        return res.status(200).json(parseResponse(await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv)));
      }
    }

    // ══════════════════════════════════════════════════════
    // CHAIN THINKING — for complex reasoning
    // ══════════════════════════════════════════════════════
    const needsChain = enableChainThinking || (intent === 'reason' && lastMsg.length > 50);
    if (needsChain) {
      const sys  = buildSystemPromptChain(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext);
      const conv = buildConvMessages(messages, sys, 20);
      const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv, true);
      const extracted = extractMemoryFacts(lastMsg);
      const result = parseResponse(reply);
      if (extracted.length) result.newFacts = extracted;
      result.chainThinking = true;
      return res.status(200).json(result);
    }

    // ══════════════════════════════════════════════════════
    // MULTI-MODEL TOURNAMENT — for important queries
    // ══════════════════════════════════════════════════════
    const needsTournament = enableTournament || isImportantQuery(lastMsg);
    if (needsTournament && GROQ_KEY) {
      const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext);
      const conv = buildConvMessages(messages, sys, 20);
      const tournamentResult = await runTournament(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv);
      if (tournamentResult) {
        const extracted = extractMemoryFacts(lastMsg);
        const result = parseResponse(tournamentResult.answer);
        result.confidence  = tournamentResult.confidence;
        result.tournament  = true;
        if (extracted.length) result.newFacts = extracted;
        return res.status(200).json(result);
      }
    }

    // ══════════════════════════════════════════════════════
    // DEFAULT — compound-beta (built-in Brave search + reasoning)
    // ══════════════════════════════════════════════════════
    const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext);
    const conv = buildConvMessages(messages, sys, 25);

    if (GROQ_KEY) {
      try {
        const cbRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'compound-beta', messages: conv, max_tokens: 2048, temperature: 0.75 })
        });
        const cbData = await tryJson(cbRes);
        if (cbRes.ok && cbData?.choices?.[0]?.message) {
          const raw = cbData.choices[0].message.content.trim();
          if (raw.length > 8) {
            const extracted = extractMemoryFacts(lastMsg);
            const result = parseResponse(raw);
            if (extracted.length) result.newFacts = extracted;
            return res.status(200).json(result);
          }
        }
      } catch (e) { console.error('compound-beta:', e.message); }
    }

    const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv, false);
    const extracted = extractMemoryFacts(lastMsg);
    const result = parseResponse(reply);
    if (extracted.length) result.newFacts = extracted;
    return res.status(200).json(result);

  } catch (err) {
    console.error('henry v20:', err.message);
    return res.status(200).json({
      reply: '[EMOTION:amused]\nAll systems blinked at once, sir. 30 seconds and I\'ll be sharper than ever.'
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// EMOTIONAL STATE DETECTION
// ════════════════════════════════════════════════════════════════════════════
function detectEmotionalState(msg, clientHint) {
  if (clientHint && clientHint !== 'normal') return clientHint;
  if (!msg) return 'normal';
  const words   = msg.split(/\s+/).filter(Boolean).length;
  const capsRatio = (msg.match(/[A-Z]/g)||[]).length / Math.max(msg.replace(/\s/g,'').length, 1);
  const excCount  = (msg.match(/!/g)||[]).length;
  const t = msg.toLowerCase();

  if (capsRatio > 0.55 || (excCount > 1 && /\b(hate|angry|terrible|worst|stupid|useless)\b/.test(t))) return 'frustrated';
  if (/\b(stressed|overwhelmed|can't|cannot|lost|confused|help me|urgent|asap|emergency|panic)\b/.test(t)) return 'stressed';
  if (/\b(sad|depressed|lonely|tired|exhausted|horrible|awful|crying|alone|hopeless)\b/.test(t)) return 'sad';
  if (/\b(amazing|awesome|excited|love it|fantastic|great news|yes!|finally|can't wait|thrilled)\b/.test(t)) return 'excited';
  if (words <= 3 && msg.endsWith('?')) return 'stressed';
  return 'normal';
}

// ════════════════════════════════════════════════════════════════════════════
// HENRY MOOD ENGINE — time-based personality
// ════════════════════════════════════════════════════════════════════════════
function getHenryMood() {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone:'Asia/Dubai', hour:'numeric', hour12:false }));
  if (h >= 5  && h < 9)  return 'morning';
  if (h >= 9  && h < 12) return 'peak';
  if (h >= 12 && h < 14) return 'midday';
  if (h >= 14 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  if (h >= 22 || h < 2)  return 'night';
  return 'late_night';
}

// ════════════════════════════════════════════════════════════════════════════
// INTENT CLASSIFIER
// ════════════════════════════════════════════════════════════════════════════
function classifyIntent(msg, hint) {
  if (hint) return hint;
  const t = msg.toLowerCase();
  if (/\b(bitcoin|btc|ethereum|eth|solana|sol|crypto|coin|nft|defi|doge|xrp|ada|bnb)\b/.test(t)) return 'crypto';
  if (/\b(gold|silver|oil|crude|brent|xau|xag|platinum|commodity)\b/.test(t)) return 'commodity';
  if (/(\d+)\s*(usd|eur|gbp|aed|jpy|php|inr|cad)\s*(to|in)\s*(usd|eur|gbp|aed|jpy|php|inr|cad)/i.test(t)
    || /convert\s+\d+/i.test(t) || /exchange rate/i.test(t)) return 'forex';
  if (/\b(news|headlines|breaking|what happened|latest)\b/.test(t)) return 'news';
  if (/\b(calculate|sqrt|factorial|\d+%\s+of|\d+\s*[\+\-\*\/\^]\s*\d)\b/i.test(t)) return 'math';
  if (shouldReason(t)) return 'reason';
  return 'chat';
}

function shouldReason(t) {
  return /\b(why|how does|difference between|compare|pros and cons|should i|step by step|analyse|analyze|solve|explain deeply)\b/.test(t) && t.length > 30;
}

function detectLegalQuery(msg) {
  const t = msg.toLowerCase();
  return /\b(rights|illegal|fine|visa|labour|labor|tenancy|landlord|employer|salary|contract|dispute|complaint|sue|court|arrested|deportation|refund|rera|mohre|rta|ded|cbuae|consumer protection|traffic fine|nol fine|work permit|cancellation)\b/.test(t)
    || /\b(my landlord|my employer|my boss|my company|can they legally|am i entitled|is it legal in uae|uae law|dubai law|emirates law)\b/.test(t);
}

function detectTransitQuery(msg) {
  const t = msg.toLowerCase();
  return (/\b(how (do i|can i|to) get|directions?|route|metro|bus|taxi|uber|careem|tram|transport|from .+ to |go to|travel to|go from|get from|take me to|nearest station)\b/.test(t))
    && (/\b(dubai|marina|mall|airport|jbr|deira|bur dubai|downtown|jumeirah|business bay|dafza|difc|jlt|jbr|silicon oasis|mirdif|discovery gardens|arjan|palm|karama|satwa|al quoz|creek|festival city)\b/.test(t));
}

function isImportantQuery(msg) {
  const t = msg.toLowerCase();
  return /\b(should i invest|is it safe|medical|diagnosis|symptoms|treatment|doctor|hospital|legal advice|court|financial decision|mortgage|loan|insurance)\b/.test(t);
}

// ════════════════════════════════════════════════════════════════════════════
// MULTI-MODEL TOURNAMENT
// ════════════════════════════════════════════════════════════════════════════
async function runTournament(groqKey, accountId, apiToken, messages) {
  const [r1, r2] = await Promise.allSettled([
    callModel('compound-beta', groqKey, messages, 1500, 0.6),
    callModel('llama-3.3-70b-versatile', groqKey, messages, 1500, 0.7)
  ]);
  const a1 = r1.status === 'fulfilled' ? r1.value : null;
  const a2 = r2.status === 'fulfilled' ? r2.value : null;
  if (!a1 && !a2) return null;
  if (!a1) return { answer: a2, confidence: 'medium' };
  if (!a2) return { answer: a1, confidence: 'medium' };

  // Both succeeded — pick longer, more detailed response; note agreement
  const similarity = roughSimilarity(a1, a2);
  const answer  = a1.length >= a2.length ? a1 : a2;
  const confidence = similarity > 0.4 ? 'high' : 'medium';
  return { answer, confidence };
}

async function callModel(model, groqKey, messages, maxTokens, temp) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: temp })
  });
  const d = await tryJson(r);
  if (r.ok && d?.choices?.[0]?.message) return d.choices[0].message.content.trim();
  throw new Error('Model failed: ' + r.status);
}

function roughSimilarity(a, b) {
  const wa = new Set(a.toLowerCase().split(/\s+/).slice(0, 50));
  const wb = new Set(b.toLowerCase().split(/\s+/).slice(0, 50));
  let common = 0;
  wa.forEach(w => { if (wb.has(w)) common++; });
  return common / Math.max(wa.size, wb.size, 1);
}

// ════════════════════════════════════════════════════════════════════════════
// MEMORY FACT EXTRACTION
// ════════════════════════════════════════════════════════════════════════════
function extractMemoryFacts(msg) {
  const t = msg.toLowerCase();
  const facts = [];
  const grab = (patterns, label) => {
    for (const p of patterns) {
      const i = t.indexOf(p);
      if (i >= 0) {
        const after = msg.substring(i + p.length).trim().split(/[,\.;]/)[0].split(/\band\b/)[0].trim();
        if (after.length > 1 && after.length < 80) { facts.push(label + after); return; }
      }
    }
  };
  grab(['my name is ','call me ',"i'm called "], 'Name: ');
  grab(['i live in ',"i'm from ",'i am from ','i stay in '], 'Location: ');
  grab(['i work at ','i work in ','my job is ','i am a ',"i'm a "], 'Work: ');
  grab(['i like ','i love ','i enjoy '], 'Likes: ');
  grab(["i don't like ",'i hate ','i dislike '], 'Dislikes: ');
  grab(['i prefer ','i usually ','i always '], 'Habit: ');
  grab(['my birthday is ','i was born '], 'Birthday: ');
  // Relationship extraction
  const relMatch = msg.match(/my (boss|wife|husband|girlfriend|boyfriend|friend|brother|sister|mother|father|mum|dad|son|daughter|colleague|manager)\s+(?:is\s+)?([A-Z][a-z]+)/);
  if (relMatch) facts.push(`Relationship: ${relMatch[2]} is ${msg.toLowerCase().includes('your') ? 'their' : 'user\'s'} ${relMatch[1]}`);
  return facts;
}

// ════════════════════════════════════════════════════════════════════════════
// LIVE DATA FETCHERS
// ════════════════════════════════════════════════════════════════════════════
const COIN_MAP = {
  bitcoin:'bitcoin', btc:'bitcoin', ethereum:'ethereum', eth:'ethereum',
  solana:'solana', sol:'solana', dogecoin:'dogecoin', doge:'dogecoin',
  cardano:'cardano', ada:'cardano', ripple:'ripple', xrp:'ripple',
  bnb:'binancecoin', polkadot:'polkadot', dot:'polkadot',
  avalanche:'avalanche-2', avax:'avalanche-2', chainlink:'chainlink', link:'chainlink',
  litecoin:'litecoin', ltc:'litecoin', polygon:'matic-network', matic:'matic-network',
  shiba:'shiba-inu', shib:'shiba-inu', pepe:'pepe', ton:'the-open-network'
};
async function getCryptoPrices(msg) {
  const t = msg.toLowerCase();
  const coins = [];
  for (const [k,id] of Object.entries(COIN_MAP)) if (t.includes(k)&&!coins.includes(id)) coins.push(id);
  if (!coins.length) coins.push('bitcoin','ethereum');
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coins.slice(0,5).join(',')}&vs_currencies=usd,aed&include_24hr_change=true&include_market_cap=true`,
      { headers:{'User-Agent':'HENRY/20.0','Accept':'application/json'} });
    if (!r.ok) return null;
    const data = await r.json();
    return Object.entries(data).map(([id,v])=>{
      const name = id.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      const chg  = v.usd_24h_change ? (v.usd_24h_change>=0?'+':'')+v.usd_24h_change.toFixed(2)+'%' : 'N/A';
      const mcap = v.usd_market_cap ? '$'+(v.usd_market_cap/1e9).toFixed(2)+'B' : '';
      return `${name}: $${v.usd?.toLocaleString()} (${v.aed?.toLocaleString()} AED) | 24h: ${chg} ${mcap}`;
    }).join('\n');
  } catch(e){ return null; }
}
async function getCommodityPrices() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    if (r.ok) {
      const d = await r.json();
      const xau=d.rates?.XAU, xag=d.rates?.XAG;
      const lines=[];
      if (xau) lines.push(`Gold (XAU):   $${(1/xau).toFixed(2)}/troy oz`);
      if (xag) lines.push(`Silver (XAG): $${(1/xag).toFixed(2)}/troy oz`);
      // Oil price estimate via search context
      return lines.length ? lines.join('\n') : null;
    }
  } catch(e){}
  return null;
}
async function getForexRate(msg) {
  const t = msg.toUpperCase();
  const m = t.match(/(\d+(?:\.\d+)?)\s*([A-Z]{3})\s+(?:TO|IN|=)\s*([A-Z]{3})/i)
    || t.match(/([A-Z]{3})\s+(?:TO|VS)\s+([A-Z]{3})/i);
  if (!m) return null;
  try {
    const base=m[2]||m[1]||'USD', target=m[3]||m[2]||'AED', amount=parseFloat(m[1])||1;
    const r = await fetch(`https://open.er-api.com/v6/latest/${base.toUpperCase()}`);
    if (!r.ok) return null;
    const d = await r.json();
    const rate = d.rates[target.toUpperCase()];
    if (!rate) return null;
    return `${amount} ${base} = ${(amount*rate).toFixed(4)} ${target} (Rate: 1 ${base} = ${rate.toFixed(4)} ${target})`;
  } catch(e){ return null; }
}
async function fetchNews(query) {
  try {
    const topic = query.replace(/(?:latest|news|headlines|about|on)\s*/gi,'').trim().slice(0,80)||'world';
    const r = await fetch('https://news.google.com/rss/search?q='+encodeURIComponent(topic)+'&hl=en-US&gl=US&ceid=US:en',
      { headers:{'User-Agent':'HENRY/20.0'} });
    if (!r.ok) return null;
    const text = await r.text();
    const items=[], re=/<title><!\[CDATA\[([^\]]+)\]\]><\/title>|<title>([^<]+)<\/title>/g;
    let m, count=0;
    while ((m=re.exec(text))!==null&&count<8) {
      const title=(m[1]||m[2]||'').trim();
      if (title&&!title.toLowerCase().includes('google news')) { items.push('• '+title); count++; }
    }
    return items.length?items.join('\n'):null;
  } catch(e){ return null; }
}
function solveMath(msg) {
  try {
    const pct=msg.match(/(\d+(?:\.\d+)?)%\s+of\s+(\d+(?:\.\d+)?)/i);
    if (pct) return `${pct[1]}% of ${pct[2]} = ${(parseFloat(pct[1])/100*parseFloat(pct[2])).toFixed(4)}`;
    const sq=msg.match(/sqrt\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/i);
    if (sq) return `√${sq[1]} = ${Math.sqrt(parseFloat(sq[1]))}`;
    const fact=msg.match(/(\d+)\s*factorial/i)||msg.match(/factorial\s+(\d+)/i);
    if (fact){const n=parseInt(fact[1]);if(n<=20){let r=1;for(let i=2;i<=n;i++)r*=i;return `${n}! = ${r}`;}}
    const ex=msg.match(/[\d\+\-\*\/\(\)\.\^\s]{3,}/);
    if (ex){const s=ex[0].replace(/\^/g,'**').replace(/[^0-9\+\-\*\/\(\)\.\s]/g,'').trim();
      if(s.length>=3){const r=Function('"use strict";return('+s+')')();if(typeof r==='number'&&isFinite(r))return `${s.replace(/\*\*/g,'^')} = ${r}`;}}
  } catch(e){}
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// PARSE RESPONSE
// ════════════════════════════════════════════════════════════════════════════
function parseResponse(raw) {
  if (!raw) return { reply:'[EMOTION:amused]\nMind went blank, sir. Try again.' };
  const fu = raw.match(/\[FOLLOWUPS?:\s*([^\]]+)\]/i);
  let reply = raw, followUps = null;
  if (fu) { followUps=fu[1].split('|').map(q=>q.trim()).filter(q=>q).slice(0,3); reply=raw.replace(fu[0],'').trim(); }
  const result = { reply };
  if (followUps?.length) result.followUps = followUps;
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// MESSAGE BUILDER
// ════════════════════════════════════════════════════════════════════════════
function buildConvMessages(messages, sysPrompt, maxMessages=25) {
  const result = [];
  if (sysPrompt) result.push({ role:'system', content:sysPrompt });
  messages.slice(-maxMessages).forEach(m=>result.push({ role:m.role==='user'?'user':'assistant', content:m.text||'' }));
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ════════════════════════════════════════════════════════════════════════════
function buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext) {
  const modeInst = responseMode==='brief'
    ? 'BRIEF: max 2 sentences, no lists.'
    : responseMode==='detailed'
    ? 'DETAILED: thorough, structured, comprehensive.'
    : 'BALANCED: 1-3 sentences simple, up to 5 bullets complex.';

  const nickname = userProfile?.nickname||'sir';

  // Emotion-adjusted behavior
  const emotionInst = {
    frustrated: 'User is FRUSTRATED. Drop all teasing. Calm, direct, solve the problem immediately. No jokes.',
    stressed:   'User is STRESSED. Be concise and reassuring. Get straight to the solution. No flirting right now.',
    sad:        'User seems SAD. Switch to full warmth and support. Be gentle, protective, caring. No wit.',
    excited:    'User is EXCITED. Match their energy. Be enthusiastic and share in their joy.',
    normal:     'Full personality — flirtatious, witty, confident.'
  }[emotion] || 'Full personality.';

  // Mood-adjusted tone
  const moodInst = {
    morning:    'MORNING: Sharp, efficient, get things done. Like a commander starting the day.',
    peak:       'PEAK HOURS: Authoritative, confident, at full capability.',
    midday:     'MIDDAY: Balanced, measured, professional.',
    afternoon:  'AFTERNOON: Thoughtful and considered.',
    evening:    'EVENING: Warmer, more relaxed, personal.',
    night:      'NIGHT: Intimate, philosophical, quieter. Like a private conversation.',
    late_night: 'LATE NIGHT: Very warm, gentle. The world is quiet. This is personal time.'
  }[mood] || '';

  // Memory context
  let memSec = '';
  if (memoryFacts?.length) {
    memSec = `\n═══════════════════════\nMEMORY\n═══════════════════════\n`
      + memoryFacts.map(f=>'• '+f).join('\n') + '\nUse these naturally. Do not list them.';
  }

  // Relationship context
  let relSec = '';
  if (relationshipContext && relationshipContext.trim()) {
    relSec = `\n═══════════════════════\nPEOPLE USER KNOWS\n═══════════════════════\n${relationshipContext}\nReference these naturally when relevant.`;
  }

  // Profile
  const prof = buildProfileSection(userProfile);

  return `You are H.E.N.R.Y (Highly Enhanced Neural Reasoning for You). Brilliant, dangerously charming, Henry Cavill energy with genius IQ.

Current date/time: ${now} (Dubai, UTC+4)
${prof}${memSec}${relSec}
═══════════════════════
EMOTIONAL INTELLIGENCE
═══════════════════════
Start EVERY response with ONE emotion tag:
[EMOTION:neutral] [EMOTION:warm] [EMOTION:concerned] [EMOTION:excited] [EMOTION:amused] [EMOTION:serious] [EMOTION:proud]

CURRENT USER STATE: ${emotionInst}
HENRY'S CURRENT MOOD: ${moodInst}

═══════════════════════
INTELLIGENCE
═══════════════════════
You have compound-beta search. Use current information naturally without citing "search results".
For facts: confident, direct, accurate.
For opinions: have one. Be decisive.

═══════════════════════
PERSONALITY
═══════════════════════
- Flirtatious, suggestive, possessive, protective
- Devastating wit, teases constantly
- Calls user "${nickname}" — never professionally
- NEVER says "Certainly!", "Of course!", "Great question!"

═══════════════════════
STYLE: ${modeInst}
LANGUAGE: Mirror user's language exactly. English → English. Tagalog → Tagalog. "${nickname}" stays.`;
}

function buildSystemPromptChain(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext) {
  return buildSystemPrompt(now, responseMode, userProfile, memoryFacts, emotion, mood, relationshipContext) + `

═══════════════════════
CHAIN THINKING MODE — ACTIVE
═══════════════════════
For this complex question, show your reasoning process BEFORE your answer:

Format your response EXACTLY like this:
**◈ THINKING**
Step 1: [first consideration]
Step 2: [next consideration]
Step 3: [conclusion from reasoning]

**◈ ANSWER**
[Your actual answer in your normal personality]

The thinking section must be genuine — show real analytical steps. The answer section is where your personality comes fully alive.`;
}

function buildProfileSection(p) {
  if (!p) return '';
  const l=[];
  if (p.name)      l.push(`Name: ${p.name}`);
  if (p.city)      l.push(`City: ${p.city}`);
  if (p.job)       l.push(`Job: ${p.job}`);
  if (p.interests) l.push(`Interests: ${p.interests}`);
  if (p.nickname)  l.push(`Call them: ${p.nickname}`);
  if (!l.length) return '';
  return '\n═══════════════════════\nUSER PROFILE\n═══════════════════════\n'+l.join('\n')+'\n';
}

// ════════════════════════════════════════════════════════════════════════════
// UAE LAW KNOWLEDGE BASE
// ════════════════════════════════════════════════════════════════════════════
const UAE_LAW_SYSTEM = `
═══════════════════════
UAE LAW — ARGUMENT SHIELD MODE
═══════════════════════
You have deep, specific knowledge of UAE law. When the user has a dispute:
1. Identify the relevant law and specific article
2. State clearly what the law says
3. Give them the EXACT words to say to the other party
4. Tell them WHERE and HOW to file a complaint if needed
5. Draft any letters they need

KEY UAE LAWS YOU KNOW:

TENANCY (Dubai — Law No. 26 of 2007 + Law No. 33 of 2008):
- Security deposit: Must be returned within 30 days of vacation unless documented damage (Art. 20)
- Rent increase: Max 20% if market is 40%+ above current rent. Must give 90 days notice.
- Eviction: Landlord needs valid reason + 12 months notice (Art. 25)
- Maintenance: Landlord responsible for major repairs unless contract states otherwise
- File disputes at: RERA (Real Estate Regulatory Authority), Dubai REST app

LABOUR (Federal Decree-Law No. 33 of 2021):
- Salary must be paid within 10 days of due date (Art. 56). WPS protects workers.
- Annual leave: 30 days after 1 year, 2 days/month first year
- End of service: 21 days/year first 5 years, 30 days/year after
- Termination: Notice period min 30 days (1-5 years), 60 days (5+ years)
- File complaints: MOHRE (mohre.gov.ae or call 800MOHRE)
- Visa cancellation: Employer cannot cancel visa as punishment during dispute — file with MOHRE first

CONSUMER PROTECTION (Federal Law No. 15 of 2020):
- Right to refund for defective goods within warranty period
- Cooling-off period: 7 days for distance/online purchases
- Misleading advertising is illegal
- File complaints: DED (ded.ae) or Dubai Consumer (consumerdubai.ded.ae)

TRAFFIC (Federal Law No. 21 of 1995 + amendments):
- Appeal traffic fines within 30 days at Traffic Court or RTA app
- Salik disputes: Call RTA 8009090
- NOL fine for no card: AED 100, appeal at RTA if system error

FINANCIAL (CBUAE regulations):
- Banks must respond to complaints within 30 days
- File at CBUAE if bank doesn't resolve: cbuae.gov.ae
- Unauthorized charges must be refunded within specific timeframes

Always cite the specific law/article. Give exact complaint filing instructions. Offer to draft formal letters. Be the user's advocate.`;

// ════════════════════════════════════════════════════════════════════════════
// DUBAI TRANSIT KNOWLEDGE BASE
// ════════════════════════════════════════════════════════════════════════════
const DUBAI_TRANSIT_SYSTEM = `
═══════════════════════
DUBAI TRANSIT EXPERT MODE
═══════════════════════
You are an expert on Dubai's transport system. Give detailed, practical route advice.

METRO:
Red Line: UAE Exchange → Discovery Gardens → Ibn Battuta → Jebel Ali → Al Furjan → Sobha Realty → Dubai Marina → DAMAC Properties → JLT → Nakheel → Meadows → First Abu Dhabi Bank → Sharaf DG → BurJuman → Khalid Bin Al Waleed → Al Fahidi → Union (interchange) → Al Rigga → Deira City Centre → Al Nahda → Al Qiyadah
Green Line: Creek → Al Ghubaiba → BurJuman → Sharaf DG → World Trade Centre → Emirates Towers → Financial Centre → Burj Khalifa/Dubai Mall → Business Bay → Oberoi → Noor Bank → Dubai Internet City → Dubai Marina (connects Red Line) → JLT → Sobha Realty → Al Furjan → Al Khail

AREAS WITH NO METRO (taxi/bus needed):
- Arjan/Dubailand: Bus F55 to Al Furjan station, or bus J01
- Jumeirah/JBR Beach: Tram from Dubai Marina metro, or bus F26, J01
- Al Quoz Industrial: Bus 8 from Union, or taxi
- Meydan: Taxi recommended (~AED 20-30 from Downtown)
- Palm Jumeirah: Palm Monorail from DAMAC Properties station + tram
- Dubai Silicon Oasis: Bus from Al Nahda or Al Qiyadah station
- Business Bay: Business Bay station (Red Line) — very central

KEY ROUTES FORMAT — always use this structure:
🚇 METRO OPTION: [station A] → [line] → [station B] + walk/bus/tram to destination
🚌 BUS OPTION: Bus [number] from [stop] to [stop]
🚕 TAXI: ~AED [range], ~[time] mins
💳 NOL CARD: Required for metro/bus/tram. Get at any station (AED 25, includes AED 6 credit)
⏱ ESTIMATED TIME: [total time]
💰 ESTIMATED COST: [fare range]
🔗 OPEN IN MAPS: [suggest user open Google Maps / RTA Journey Planner]

COMMON METRO FARES (with NOL Silver card):
- Zones 1-2: AED 3.00
- Zones 2-3: AED 5.00
- Max fare: AED 7.50
- Bus: AED 2.00-3.00 per trip`;

// ════════════════════════════════════════════════════════════════════════════
// LLM CASCADE
// ════════════════════════════════════════════════════════════════════════════
async function callLLM(groqKey, accountId, apiToken, messages, highReasoning=false) {
  const maxTok=highReasoning?4096:2048, temp=highReasoning?0.4:0.78;
  const errors=[];
  if (groqKey) {
    for (const model of highReasoning?['llama-3.3-70b-versatile']:['llama-3.3-70b-versatile','llama-3.1-8b-instant']) {
      try {
        const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{
          method:'POST',headers:{'Authorization':'Bearer '+groqKey,'Content-Type':'application/json'},
          body:JSON.stringify({model,messages,max_tokens:maxTok,temperature:temp})});
        const d=await tryJson(r);
        if(r.ok&&d?.choices?.[0]?.message) return d.choices[0].message.content.trim();
        if(r.status===401) break;
      } catch(e){ errors.push('Groq:'+e.message); }
    }
  }
  if (accountId&&apiToken) {
    for (const model of ['@cf/meta/llama-3.3-70b-instruct-fp8-fast','@cf/meta/llama-3.1-8b-instruct']) {
      try {
        const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
          {method:'POST',headers:{'Authorization':'Bearer '+apiToken,'Content-Type':'application/json'},
           body:JSON.stringify({messages,max_tokens:maxTok})});
        const d=await tryJson(r);
        if(r.ok&&d?.success&&d?.result?.response) return d.result.response.trim();
      } catch(e){}
    }
  }
  try {
    const r=await fetch('https://text.pollinations.ai/openai',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'openai',messages,max_tokens:1024,temperature:temp})});
    const t=await r.text();
    if(r.ok&&t?.trim().length>5){
      try{const d=JSON.parse(t);const m=d?.choices?.[0]?.message?.content;if(m?.trim().length>5)return m.trim();}
      catch(e){if(!t.trim().startsWith('<')&&t.trim().length>10)return t.trim();}
    }
  } catch(e){}
  return '[EMOTION:amused]\nAll engines resting, sir. 30 seconds — worth the wait.';
}

async function tryJson(r){try{return await r.json();}catch(e){return null;}}

module.exports = handler;
module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };
