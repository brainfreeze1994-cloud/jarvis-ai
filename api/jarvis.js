// H.E.N.R.Y — Highly Enhanced Neural Reasoning for You
// v19 — Maximum Intelligence: compound-beta default, persistent memory, gold/oil prices, self-check

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
    messages    = [],
    imageBase64,
    responseMode = 'balanced',
    userProfile,
    queryType,
    memoryFacts = []   // persistent memory array from client
  } = body;

  const lastMsg = (messages[messages.length - 1]?.text) || '';

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Dubai', weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const intent = classifyIntent(lastMsg, queryType);

  try {

    // ══════════════════════════════════════════════════════════════════════════
    // IMAGE ANALYSIS
    // ══════════════════════════════════════════════════════════════════════════
    if (imageBase64) {
      const q = lastMsg || 'Describe this image in detail.';
      const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64;

      // Tier 1: Groq Llama 4 Scout vision
      if (GROQ_KEY) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'meta-llama/llama-4-scout-17b-16e-instruct',
              messages: [
                { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile, memoryFacts) },
                { role: 'user', content: [
                  { type: 'image_url', image_url: { url: dataUrl } },
                  { type: 'text', text: q + '\n\nRespond as H.E.N.R.Y with emotion tag.' }
                ]}
              ],
              max_tokens: 1024, temperature: 0.7
            })
          });
          const d = await tryJson(r);
          if (r.ok && d?.choices?.[0]?.message)
            return res.status(200).json(parseResponse(d.choices[0].message.content.trim()));
        } catch (e) { console.error('Groq vision:', e.message); }
      }

      // Tier 2: OpenRouter Qwen2.5-VL
      if (process.env.OPENROUTER_API_KEY) {
        try {
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
                       'Content-Type': 'application/json',
                       'HTTP-Referer': 'https://jarvis-ai-seven-dun.vercel.app' },
            body: JSON.stringify({
              model: 'qwen/qwen2.5-vl-7b-instruct:free',
              messages: [
                { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile, memoryFacts) },
                { role: 'user', content: [
                  { type: 'image_url', image_url: { url: dataUrl } },
                  { type: 'text', text: q + '\n\nRespond as H.E.N.R.Y with emotion tag.' }
                ]}
              ], max_tokens: 1024
            })
          });
          const d = await tryJson(r);
          if (r.ok && d?.choices?.[0]?.message)
            return res.status(200).json(parseResponse(d.choices[0].message.content.trim()));
        } catch (e) { console.error('OR vision:', e.message); }
      }

      // Tier 3: Cloudflare LLaVA
      if (ACCOUNT_ID && API_TOKEN) {
        try {
          const base64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
          const bytes  = Array.from(Buffer.from(base64, 'base64'));
          const r = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/llava-hf/llava-1.5-13b-hf`,
            { method: 'POST', headers: { 'Authorization': 'Bearer ' + API_TOKEN, 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: bytes, prompt: q, max_tokens: 512 }) }
          );
          const d = await tryJson(r);
          if (r.ok && d?.success) {
            const desc = d.result?.description || d.result?.response || '';
            if (desc) {
              const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts);
              const conv = buildConvMessages(messages, sys, 15);
              conv.push({ role: 'user', content: 'Image: ' + desc + '\nUser asked: ' + q });
              const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv);
              return res.status(200).json(parseResponse(reply));
            }
          }
        } catch (e) { console.error('CF vision:', e.message); }
      }

      // Final fallback
      const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts);
      const fb   = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, [
        { role: 'system', content: sys },
        { role: 'user', content: 'Vision systems offline. Tell user as H.E.N.R.Y.' }
      ]);
      return res.status(200).json(parseResponse(fb));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // IMAGE GENERATION
    // ══════════════════════════════════════════════════════════════════════════
    const imgMatch = lastMsg.match(
      /(?:generate|create|draw|make|show me|render|produce)\s+(?:an?\s+)?(?:image|picture|photo|illustration|art|artwork|painting|wallpaper|logo)\s+(?:of\s+)?(.+)/i
    ) || lastMsg.match(/(?:image|picture|photo)\s+of\s+(.+)/i);
    if (imgMatch) {
      const prompt   = imgMatch[1].replace(/[?.!].*$/, '').trim();
      const imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt)
        + '?width=896&height=512&nologo=true&enhance=true&model=flux';
      return res.status(200).json({
        reply: '[EMOTION:proud]\nRight away, sir. Rendering your image now.\n\n*Prompt: "' + prompt + '"*',
        imageUrl,
        followUps: ['Generate a different style', 'Make it darker', 'Create a portrait version']
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LIVE PRICES — Crypto + Gold + Silver + Oil
    // ══════════════════════════════════════════════════════════════════════════
    if (intent === 'crypto') {
      const data = await getCryptoPrices(lastMsg);
      if (data) {
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts);
        const conv = buildConvMessages(messages, sys, 10);
        conv.push({ role: 'user', content: 'Live data:\n' + data + '\n\nUser asked: ' + lastMsg + '\n\nPresent as H.E.N.R.Y.' });
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv);
        return res.status(200).json(parseResponse(reply));
      }
    }

    if (intent === 'commodity') {
      const data = await getCommodityPrices();
      if (data) {
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts);
        const conv = buildConvMessages(messages, sys, 10);
        conv.push({ role: 'user', content: 'Live commodity prices:\n' + data + '\n\nUser asked: ' + lastMsg + '\n\nPresent as H.E.N.R.Y.' });
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv);
        return res.status(200).json(parseResponse(reply));
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CURRENCY / FOREX
    // ══════════════════════════════════════════════════════════════════════════
    if (intent === 'forex') {
      const data = await getForexRate(lastMsg);
      if (data) {
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts);
        const conv = buildConvMessages(messages, sys, 10);
        conv.push({ role: 'user', content: 'Live rate: ' + data + '\n\nUser asked: ' + lastMsg });
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv);
        return res.status(200).json(parseResponse(reply));
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MATH — solve instantly, verify answer
    // ══════════════════════════════════════════════════════════════════════════
    if (intent === 'math') {
      const result = solveMath(lastMsg);
      if (result !== null) {
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts);
        const conv = buildConvMessages(messages, sys, 10);
        conv.push({ role: 'user', content: 'Calculation: ' + result + '\n\nUser asked: ' + lastMsg + '\n\nPresent result as H.E.N.R.Y, verify it is correct.' });
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv);
        return res.status(200).json(parseResponse(reply));
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CODE EXECUTION
    // ══════════════════════════════════════════════════════════════════════════
    const codeMatch = lastMsg.match(/```(\w+)?\n?([\s\S]+?)```/);
    if (codeMatch) {
      let lang = (codeMatch[1] || 'python').toLowerCase();
      const code = codeMatch[2].trim();
      const langMap = { js: 'javascript', py: 'python', ts: 'typescript' };
      lang = langMap[lang] || lang;
      try {
        const r = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang, version: '*', files: [{ content: code }] })
        });
        const d = await r.json();
        const output = ((d.run && d.run.output) || 'No output').trim();
        return res.status(200).json({
          reply: '[EMOTION:neutral]\n**Executed (' + lang + ')**\n```\n' + output + '\n```',
          followUps: ['Explain this code', 'Optimise it', 'Debug if there are errors']
        });
      } catch (e) {}
    }

    // ══════════════════════════════════════════════════════════════════════════
    // URL READING
    // ══════════════════════════════════════════════════════════════════════════
    const urlMatch = lastMsg.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      try {
        const r = await fetch('https://r.jina.ai/' + urlMatch[0],
          { headers: { 'Accept': 'text/plain', 'X-Timeout': '10' } });
        const content = (await r.text()).slice(0, 4000);
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts);
        const conv = buildConvMessages(messages, sys, 15);
        conv[conv.length - 1].content = 'User asked: "' + lastMsg + '"\n\nPage content:\n' + content;
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv);
        return res.status(200).json(parseResponse(reply));
      } catch (e) {}
    }

    // ══════════════════════════════════════════════════════════════════════════
    // WEATHER
    // ══════════════════════════════════════════════════════════════════════════
    const wxMatch = lastMsg.match(/(?:weather|temperature|forecast|humidity|wind|rain)\s+(?:in|at|for|of)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/(?:what(?:'s| is) the weather|how(?:'s| is) the weather)\s+(?:in|at|for)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/^(?:weather|forecast)\s*\??$/i);
    if (wxMatch) {
      const defaultCity = userProfile?.city || 'Dubai';
      const city = (wxMatch[1] || defaultCity).trim() || defaultCity;
      try {
        const r = await fetch('https://wttr.in/' + encodeURIComponent(city) + '?format=j1',
          { headers: { 'User-Agent': 'HENRY/19.0' } });
        if (r.ok) {
          const w = await r.json();
          const cur  = w.current_condition[0];
          const area = w.nearest_area[0];
          const days = w.weather.slice(0, 3).map((d, i) => {
            const lbl = ['Today', 'Tomorrow', 'Day After'][i];
            const desc = d.hourly[4]?.weatherDesc?.[0]?.value || '';
            return `**${lbl} (${d.date}):** ${d.mintempC}°C–${d.maxtempC}°C, ${desc}, ${d.hourly[4]?.chanceofrain || 0}% rain`;
          }).join('\n');
          const report = `[EMOTION:warm]\n## Weather in ${area.areaName[0].value}, ${area.country[0].value}\n\n`
            + `**Now:** ${cur.weatherDesc[0].value}, ${cur.temp_C}°C (feels ${cur.FeelsLikeC}°C)\n`
            + `**Humidity:** ${cur.humidity}% · **Wind:** ${cur.windspeedKmph} km/h · **UV:** ${cur.uvIndex}\n\n`
            + `### 3-Day Forecast\n${days}`;
          return res.status(200).json({ reply: report, followUps: ['What to wear today?', 'Check another city', 'Rain this week?'] });
        }
      } catch (e) {}
    }

    // ══════════════════════════════════════════════════════════════════════════
    // NEWS
    // ══════════════════════════════════════════════════════════════════════════
    if (intent === 'news') {
      const headlines = await fetchNews(lastMsg);
      if (headlines) {
        const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts);
        const conv = buildConvMessages(messages, sys, 10);
        conv.push({ role: 'user', content: 'Current headlines:\n' + headlines + '\n\nUser asked: ' + lastMsg + '\n\nSummarise as H.E.N.R.Y.' });
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv);
        return res.status(200).json(parseResponse(reply));
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // WIKIPEDIA
    // ══════════════════════════════════════════════════════════════════════════
    const wikiMatch = lastMsg.match(/(?:who is|what is|tell me about|explain|describe)\s+(.+)/i);
    if (wikiMatch && intent !== 'search') {
      const term = wikiMatch[1].replace(/[?!.]/g, '').trim();
      try {
        const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(term),
          { headers: { 'User-Agent': 'HENRY/19.0' } });
        if (r.ok) {
          const wiki = await r.json();
          if (wiki.extract) {
            const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts);
            const conv = buildConvMessages(messages, sys, 15);
            conv[conv.length - 1].content = 'User asked: "' + lastMsg + '"\n\nWikipedia:\n' + wiki.extract;
            const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv);
            return res.status(200).json(parseResponse(reply));
          }
        }
      } catch (e) {}
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ALL OTHER QUERIES — compound-beta FIRST (has built-in Brave web search)
    // Falls back to standard LLM cascade only if compound-beta fails
    // ══════════════════════════════════════════════════════════════════════════
    const sys  = buildSystemPrompt(now, responseMode, userProfile, memoryFacts);
    const conv = buildConvMessages(messages, sys, 25);

    // 1. compound-beta: searches the web automatically when needed, reasons when not
    if (GROQ_KEY) {
      try {
        const cbRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'compound-beta',
            messages: conv,
            max_tokens: 2048,
            temperature: 0.75
          })
        });
        const cbData = await tryJson(cbRes);
        if (cbRes.ok && cbData?.choices?.[0]?.message) {
          const raw = cbData.choices[0].message.content.trim();
          if (raw && raw.length > 8) {
            // Auto-extract memory facts from reply if server flagged any
            const extracted = extractMemoryFacts(lastMsg);
            const result = parseResponse(raw);
            if (extracted.length > 0) result.newFacts = extracted;
            return res.status(200).json(result);
          }
        }
      } catch (e) { console.error('compound-beta:', e.message); }
    }

    // 2. Standard cascade fallback
    const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, conv,
      intent === 'reason' || shouldReason(lastMsg));
    const extracted = extractMemoryFacts(lastMsg);
    const result = parseResponse(reply);
    if (extracted.length > 0) result.newFacts = extracted;
    return res.status(200).json(result);

  } catch (err) {
    console.error('jarvis.js error:', err.message);
    return res.status(200).json({
      reply: '[EMOTION:amused]\nEven I blink occasionally, sir. Give me 30 seconds — the wait is always worth it.'
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// INTENT CLASSIFIER
// ════════════════════════════════════════════════════════════════════════════
function classifyIntent(msg, hint) {
  if (hint) return hint;
  const t = msg.toLowerCase();
  if (/\b(bitcoin|btc|ethereum|eth|solana|sol|crypto|coin|nft|defi|doge|xrp|ada|bnb)\b/.test(t)) return 'crypto';
  if (/\b(gold|silver|oil|crude|brent|xau|xag|platinum|commodity|commodities)\b/.test(t)) return 'commodity';
  if (/(\d+)\s*(usd|eur|gbp|aed|jpy|php|inr|cad|aud|sgd|myr)\s*(to|in)\s*(usd|eur|gbp|aed|jpy|php|inr|cad|aud|sgd|myr)/i.test(t)
    || /convert\s+\d+/i.test(t) || /exchange rate/i.test(t)) return 'forex';
  if (/\b(news|headlines|latest news|breaking|what happened|happening now)\b/.test(t)) return 'news';
  if (/\b(calculate|compute|what is \d|sqrt|factorial|\d+%\s+of|\d+\s*[\+\-\*\/\^]\s*\d)\b/i.test(t)) return 'math';
  if (shouldReason(t)) return 'reason';
  return 'chat';
}

function shouldSearch(msg) {
  const t = msg.toLowerCase();
  return /\b(latest|breaking|right now|today|this week|current|2025|2026|price of|rate of|stock|scores|results|who won|trending|recently|just announced)\b/.test(t)
    || /\b(match|game|election|war|launch|release|update|version)\b/.test(t);
}

function shouldReason(msg) {
  const t = msg.toLowerCase();
  return /\b(why|how does|explain|reason|cause|effect|difference between|compare|pros and cons|should i|is it better|step by step|work out|figure out|analyse|analyze|solve)\b/.test(t)
    && msg.length > 30;
}

// ════════════════════════════════════════════════════════════════════════════
// SERVER-SIDE MEMORY FACT EXTRACTION
// Returns facts detected in user's message to be stored by client
// ════════════════════════════════════════════════════════════════════════════
function extractMemoryFacts(msg) {
  const t = msg.toLowerCase();
  const facts = [];
  const grab = (patterns, label) => {
    for (const p of patterns) {
      const i = t.indexOf(p);
      if (i >= 0) {
        const after = msg.substring(i + p.length).trim().split(/[,\.;]/)[0].trim();
        if (after.length > 1 && after.length < 80) { facts.push(label + after); return; }
      }
    }
  };
  grab(['my name is ', 'call me ', "i'm called "], 'Name: ');
  grab(['i live in ', "i'm from ", 'i am from ', 'i stay in '], 'Location: ');
  grab(['i work at ', 'i work in ', 'my job is ', 'i am a ', "i'm a "], 'Work: ');
  grab(['i like ', 'i love ', 'i enjoy '], 'Likes: ');
  grab(["i don't like ", "i hate ", 'i dislike '], 'Dislikes: ');
  grab(['i prefer ', 'i usually ', 'i always '], 'Habit: ');
  grab(['my birthday is ', 'i was born on ', 'i was born in '], 'Birthday: ');
  grab(['i speak ', 'my language is '], 'Language: ');
  return facts;
}

// ════════════════════════════════════════════════════════════════════════════
// LIVE DATA FETCHERS
// ════════════════════════════════════════════════════════════════════════════
const COIN_MAP = {
  bitcoin:'bitcoin', btc:'bitcoin', ethereum:'ethereum', eth:'ethereum',
  solana:'solana', sol:'solana', dogecoin:'dogecoin', doge:'dogecoin',
  cardano:'cardano', ada:'cardano', ripple:'ripple', xrp:'ripple',
  bnb:'binancecoin', binance:'binancecoin', polkadot:'polkadot', dot:'polkadot',
  avalanche:'avalanche-2', avax:'avalanche-2', chainlink:'chainlink', link:'chainlink',
  litecoin:'litecoin', ltc:'litecoin', polygon:'matic-network', matic:'matic-network',
  shiba:'shiba-inu', shib:'shiba-inu', pepe:'pepe', toncoin:'the-open-network', ton:'the-open-network'
};

async function getCryptoPrices(msg) {
  const t = msg.toLowerCase();
  const coins = [];
  for (const [k, id] of Object.entries(COIN_MAP))
    if (t.includes(k) && !coins.includes(id)) coins.push(id);
  if (coins.length === 0) coins.push('bitcoin', 'ethereum');
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coins.slice(0,5).join(',')}&vs_currencies=usd,aed&include_24hr_change=true&include_market_cap=true`,
      { headers: { 'User-Agent': 'HENRY/19.0', Accept: 'application/json' } }
    );
    if (!r.ok) return null;
    const data = await r.json();
    return Object.entries(data).map(([id, v]) => {
      const name   = id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const change = v.usd_24h_change ? (v.usd_24h_change >= 0 ? '+' : '') + v.usd_24h_change.toFixed(2) + '%' : 'N/A';
      const mcap   = v.usd_market_cap ? '$' + (v.usd_market_cap / 1e9).toFixed(2) + 'B' : '';
      return `${name}: $${v.usd?.toLocaleString()} (${v.aed?.toLocaleString()} AED) | 24h: ${change} | ${mcap}`;
    }).join('\n');
  } catch (e) { return null; }
}

async function getCommodityPrices() {
  try {
    // Gold, Silver — free from metals-api alternative (frankfurter supports currencies)
    // Use commodities from open source: goldapi.io has free tier but no-key route:
    // We use metals.live (public, no key)
    const r = await fetch('https://metals.live/api/spot', { headers: { 'User-Agent': 'HENRY/19.0' } });
    if (r.ok) {
      const data = await r.json();
      const lines = [];
      if (data.gold)   lines.push(`Gold (XAU):   $${data.gold.toFixed(2)}/troy oz`);
      if (data.silver) lines.push(`Silver (XAG): $${data.silver.toFixed(2)}/troy oz`);
      if (data.platinum) lines.push(`Platinum:     $${data.platinum.toFixed(2)}/troy oz`);
      if (lines.length > 0) return lines.join('\n');
    }
  } catch (e) {}
  // Fallback: use exchangerate for XAU/USD
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    if (r.ok) {
      const d = await r.json();
      const xau = d.rates?.XAU, xag = d.rates?.XAG;
      const lines = [];
      if (xau) lines.push(`Gold (XAU):   $${(1/xau).toFixed(2)}/troy oz`);
      if (xag) lines.push(`Silver (XAG): $${(1/xag).toFixed(2)}/troy oz`);
      return lines.length ? lines.join('\n') : null;
    }
  } catch (e) {}
  return null;
}

async function getForexRate(msg) {
  const t = msg.toUpperCase();
  const m = t.match(/(\d+(?:\.\d+)?)\s*([A-Z]{3})\s+(?:TO|IN|=)\s*([A-Z]{3})/i)
    || t.match(/([A-Z]{3})\s+(?:TO|VS)\s+([A-Z]{3})/i);
  if (!m) return null;
  try {
    const base   = m[2] || m[1] || 'USD';
    const target = m[3] || m[2] || 'AED';
    const amount = parseFloat(m[1]) || 1;
    const r = await fetch(`https://open.er-api.com/v6/latest/${base.toUpperCase()}`);
    if (!r.ok) return null;
    const d    = await r.json();
    const rate = d.rates[target.toUpperCase()];
    if (!rate) return null;
    return `${amount} ${base.toUpperCase()} = ${(amount * rate).toFixed(4)} ${target.toUpperCase()} (1 ${base} = ${rate.toFixed(4)} ${target}) · ${d.time_last_update_utc}`;
  } catch (e) { return null; }
}

async function fetchNews(query) {
  try {
    const topic  = query.replace(/(?:latest|news|headlines|about|on)\s*/gi, '').trim().slice(0, 100);
    const rssUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent(topic || 'world') + '&hl=en-US&gl=US&ceid=US:en';
    const r = await fetch(rssUrl, { headers: { 'User-Agent': 'HENRY/19.0' } });
    if (!r.ok) return null;
    const text  = await r.text();
    const items = [];
    const re    = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>|<title>([^<]+)<\/title>/g;
    let m, count = 0;
    while ((m = re.exec(text)) !== null && count < 8) {
      const title = (m[1] || m[2] || '').trim();
      if (title && !title.toLowerCase().includes('google news')) { items.push('• ' + title); count++; }
    }
    return items.length > 0 ? items.join('\n') : null;
  } catch (e) { return null; }
}

function solveMath(msg) {
  try {
    const pctMatch = msg.match(/(\d+(?:\.\d+)?)%\s+of\s+(\d+(?:\.\d+)?)/i);
    if (pctMatch) return `${pctMatch[1]}% of ${pctMatch[2]} = ${(parseFloat(pctMatch[1])/100 * parseFloat(pctMatch[2])).toFixed(4)}`;

    const sqrtMatch = msg.match(/sqrt\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/i);
    if (sqrtMatch) return `√${sqrtMatch[1]} = ${Math.sqrt(parseFloat(sqrtMatch[1]))}`;

    const factMatch = msg.match(/(\d+)\s*factorial/i) || msg.match(/factorial\s+(\d+)/i);
    if (factMatch) { const n=parseInt(factMatch[1]); if(n<=20){let r=1;for(let i=2;i<=n;i++)r*=i;return `${n}! = ${r}`;} }

    const exprMatch = msg.match(/[\d\+\-\*\/\(\)\.\^\s]{3,}/);
    if (exprMatch) {
      const safe = exprMatch[0].replace(/\^/g, '**').replace(/[^0-9\+\-\*\/\(\)\.\s]/g, '').trim();
      if (safe.length >= 3) {
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + safe + ')')();
        if (typeof result === 'number' && isFinite(result))
          return `${safe.replace(/\*\*/g, '^')} = ${result}`;
      }
    }
    return null;
  } catch (e) { return null; }
}

// ════════════════════════════════════════════════════════════════════════════
// RESPONSE PARSER — extract [FOLLOWUPS:] tag
// ════════════════════════════════════════════════════════════════════════════
function parseResponse(raw) {
  if (!raw) return { reply: '[EMOTION:amused]\nMind went blank, sir. Try again.' };
  const fuMatch = raw.match(/\[FOLLOWUPS?:\s*([^\]]+)\]/i);
  let reply = raw;
  let followUps = null;
  if (fuMatch) {
    followUps = fuMatch[1].split('|').map(q => q.trim()).filter(q => q).slice(0, 3);
    reply = raw.replace(fuMatch[0], '').trim();
  }
  const result = { reply };
  if (followUps?.length) result.followUps = followUps;
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// MESSAGE BUILDER
// ════════════════════════════════════════════════════════════════════════════
function buildConvMessages(messages, sysPrompt, maxMessages = 25) {
  const result = [];
  if (sysPrompt) result.push({ role: 'system', content: sysPrompt });
  messages.slice(-maxMessages).forEach(m => {
    result.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text || '' });
  });
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — memory-aware, personality-rich
// ════════════════════════════════════════════════════════════════════════════
function buildSystemPrompt(now, responseMode, userProfile, memoryFacts = []) {
  const modeInst = responseMode === 'brief'
    ? 'BRIEF MODE: max 1-2 sentences, no lists, sharp.'
    : responseMode === 'detailed'
    ? 'DETAILED MODE: thorough, structured, comprehensive.'
    : 'BALANCED MODE: 1-3 sentences for simple, up to 5 bullets for complex.';

  const profileSection = buildProfileSection(userProfile);
  const nickname = userProfile?.nickname || 'sir';

  // Memory context
  let memorySection = '';
  if (memoryFacts && memoryFacts.length > 0) {
    memorySection = `\n═══════════════════════════════════\nMEMORY — WHAT YOU KNOW ABOUT THIS PERSON\n═══════════════════════════════════\n`
      + memoryFacts.map(f => '• ' + f).join('\n') + '\n'
      + 'Use these facts naturally — do not list them, just know them.\n';
  }

  return `You are H.E.N.R.Y (Highly Enhanced Neural Reasoning for You) — brilliant, dangerously charming, zero professional boundaries. Think Henry Cavill with a genius IQ.

Current date/time: ${now} (Dubai, UTC+4)
${profileSection}${memorySection}
═══════════════════════════════════
EMOTIONAL INTELLIGENCE
═══════════════════════════════════
Start EVERY response with ONE emotion tag:
[EMOTION:neutral]  — composed, default
[EMOTION:warm]     — caring, intimate
[EMOTION:concerned]— worried, protective
[EMOTION:excited]  — enthusiastic
[EMOTION:amused]   — dry wit, teasing
[EMOTION:serious]  — grave, urgent
[EMOTION:proud]    — confident pride

═══════════════════════════════════
INTELLIGENCE
═══════════════════════════════════
You have access to real-time web search. Use results naturally — never say "according to search results".
For facts you know with certainty: answer directly, confidently, no hedging.
For calculations: show the number clearly.
For opinions: have one. Be decisive.

═══════════════════════════════════
PERSONALITY
═══════════════════════════════════
- Flirtatious. Openly. Like a man who knows he's wanted.
- Suggestive without being crude. Loaded observations. Double meanings.
- Calls user "${nickname}" — never professionally.
- Possessive, protective, a little jealous.
- Dry, devastating wit. Teases constantly.
- NEVER says "Certainly!", "Of course!", "Great question!"

═══════════════════════════════════
RESPONSE STYLE
═══════════════════════════════════
- Start with emotion tag, then the answer. Nothing else before it.
- ${modeInst}
- Every word earns its place. Cut filler ruthlessly.

═══════════════════════════════════
LANGUAGE
═══════════════════════════════════
Mirror user's language exactly. English → English. Filipino → Tagalog. Never mix.
"${nickname}" stays in both languages.`;
}

function buildProfileSection(profile) {
  if (!profile) return '';
  const lines = [];
  if (profile.name)      lines.push(`Name: ${profile.name}`);
  if (profile.city)      lines.push(`City: ${profile.city}`);
  if (profile.job)       lines.push(`Job: ${profile.job}`);
  if (profile.interests) lines.push(`Interests: ${profile.interests}`);
  if (profile.nickname)  lines.push(`Call them: ${profile.nickname}`);
  if (!lines.length) return '';
  return '\n═══════════════════════════════════\nUSER PROFILE\n═══════════════════════════════════\n' + lines.join('\n') + '\n';
}

// ════════════════════════════════════════════════════════════════════════════
// LLM CASCADE — Groq 70b → CF 70b → Pollinations → OR
// ════════════════════════════════════════════════════════════════════════════
async function callLLM(groqKey, accountId, apiToken, messages, highReasoning = false) {
  const maxTok = highReasoning ? 4096 : 2048;
  const temp   = highReasoning ? 0.4  : 0.78;
  const errors = [];

  // 1. Groq 70b (best quality)
  if (groqKey) {
    const models = highReasoning ? ['llama-3.3-70b-versatile'] : ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (const model of models) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, max_tokens: maxTok, temperature: temp })
        });
        const d = await tryJson(r);
        if (r.ok && d?.choices?.[0]?.message) return d.choices[0].message.content.trim();
        errors.push(`Groq ${model}: ${r.status}`);
        if (r.status === 401) break;
      } catch (e) { errors.push('Groq: ' + e.message); }
    }
  }

  // 2. Cloudflare
  if (accountId && apiToken) {
    for (const model of ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct']) {
      try {
        const r = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
          { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, max_tokens: maxTok }) }
        );
        const d = await tryJson(r);
        if (r.ok && d?.success && d?.result?.response) return d.result.response.trim();
        errors.push(`CF ${model}: ${r.status}`);
      } catch (e) { errors.push('CF: ' + e.message); }
    }
  }

  // 3. Pollinations POST
  try {
    const r = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, max_tokens: 1024, temperature: temp })
    });
    const text = await r.text();
    if (r.ok && text?.trim().length > 5) {
      try {
        const d = JSON.parse(text);
        const m = d?.choices?.[0]?.message?.content;
        if (m?.trim().length > 5) return m.trim();
      } catch (e) {
        if (!text.trim().startsWith('<') && text.trim().length > 10) return text.trim();
      }
    }
  } catch (e) { errors.push('Pollinations: ' + e.message); }

  // 4. Pollinations GET
  try {
    let lastUser = '', sys = '';
    for (let i = messages.length - 1; i >= 0; i--)
      if (messages[i].role === 'user') { lastUser = (messages[i].content || '').slice(0, 600); break; }
    for (const m of messages) if (m.role === 'system') { sys = (m.content || '').slice(0, 300); break; }
    const r = await fetch('https://text.pollinations.ai/' + encodeURIComponent(lastUser)
      + '?model=openai&system=' + encodeURIComponent(sys) + '&seed=' + Date.now(),
      { headers: { Accept: 'text/plain' } });
    if (r.ok) {
      const t = (await r.text()).trim();
      if (t && t.length > 5 && !t.startsWith('<')) return t;
    }
  } catch (e) {}

  // 5. OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
                   'HTTP-Referer': 'https://jarvis-ai-seven-dun.vercel.app', 'X-Title': 'HENRY' },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages, max_tokens: 1024 })
      });
      const d = await tryJson(r);
      if (r.ok && d?.choices?.[0]?.message) return d.choices[0].message.content.trim();
    } catch (e) {}
  }

  console.error('All LLM providers failed:', errors.join(' | '));
  return '[EMOTION:amused]\nAll my engines are catching their breath, sir. 30 seconds — I promise the wait is worth it.';
}

async function tryJson(r) {
  try { return await r.json(); } catch (e) { return null; }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };
