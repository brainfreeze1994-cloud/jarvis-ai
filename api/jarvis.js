// H.E.N.R.Y — Highly Enhanced Neural Reasoning for You
// v18 — Maximum Intelligence: compound-beta search, crypto, forex, math, news, follow-ups

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

  const { messages = [], imageBase64, responseMode = 'balanced', userProfile, queryType } = body;
  const lastMsg = (messages[messages.length - 1] && messages[messages.length - 1].text) || '';

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Dubai', weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // ── SMART INTENT CLASSIFICATION ───────────────────────────────────────────
  const intent = classifyIntent(lastMsg, queryType);

  try {

    // ── IMAGE ANALYSIS ────────────────────────────────────────────────────────
    if (imageBase64) {
      const userQuestion = lastMsg || 'Describe this image in detail.';
      const imageDataUrl = imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64;

      // Tier 1: Groq Llama 4 Scout (vision)
      if (GROQ_KEY) {
        try {
          const vRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
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
          if (vRes.ok && vData?.choices?.[0]?.message) {
            const raw = vData.choices[0].message.content.trim();
            return res.status(200).json(parseResponse(raw));
          }
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
            return res.status(200).json(parseResponse(orVData.choices[0].message.content.trim()));
        } catch (e) { console.error('OR vision:', e.message); }
      }

      // Tier 3: Cloudflare LLaVA
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
              const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, [
                { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile) },
                { role: 'user', content: 'Image analysis: ' + desc + '\nUser asked: ' + userQuestion }
              ]);
              return res.status(200).json(parseResponse(reply));
            }
          }
        } catch (e) { console.error('CF vision:', e.message); }
      }

      const fallback = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, [
        { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile) },
        { role: 'user', content: 'Vision systems offline. Tell user you cannot see image right now as H.E.N.R.Y.' }
      ]);
      return res.status(200).json(parseResponse(fallback));
    }

    // ── IMAGE GENERATION ───────────────────────────────────────────────────────
    const imageMatch = lastMsg.match(/(?:generate|create|draw|make|show me|render|produce)\s+(?:an?\s+)?(?:image|picture|photo|illustration|art|artwork|painting|wallpaper|logo)\s+(?:of\s+)?(.+)/i)
      || lastMsg.match(/(?:image|picture|photo)\s+of\s+(.+)/i);
    if (imageMatch) {
      const rawPrompt   = imageMatch[1] || lastMsg;
      const cleanPrompt = rawPrompt.replace(/[?.!].*$/, '').trim();
      const imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(cleanPrompt)
        + '?width=896&height=512&nologo=true&enhance=true&model=flux';
      return res.status(200).json({
        reply: '[EMOTION:proud]\nRight away, sir. Rendering your image now.\n\n*Prompt: "' + cleanPrompt + '"*',
        imageUrl,
        followUps: ['Generate a different style', 'Make it more detailed', 'Create a dark version']
      });
    }

    // ── CRYPTO PRICE ──────────────────────────────────────────────────────────
    if (intent === 'crypto') {
      const cryptoResult = await getCryptoPrice(lastMsg);
      if (cryptoResult) {
        const sys      = buildSystemPrompt(now, responseMode, userProfile);
        const convMsgs = buildConvMessages(messages, sys, 15);
        convMsgs.push({ role: 'user', content: 'Live crypto data: ' + cryptoResult + '\n\nUser asked: ' + lastMsg + '\n\nPresent this data as H.E.N.R.Y, make it engaging.' });
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, convMsgs);
        return res.status(200).json(parseResponse(reply));
      }
    }

    // ── CURRENCY / FOREX ──────────────────────────────────────────────────────
    if (intent === 'forex') {
      const forexResult = await getForexRate(lastMsg);
      if (forexResult) {
        const sys      = buildSystemPrompt(now, responseMode, userProfile);
        const convMsgs = buildConvMessages(messages, sys, 15);
        convMsgs.push({ role: 'user', content: 'Live exchange rate data: ' + forexResult + '\n\nUser asked: ' + lastMsg });
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, convMsgs);
        return res.status(200).json(parseResponse(reply));
      }
    }

    // ── MATH / CALCULATION ────────────────────────────────────────────────────
    if (intent === 'math') {
      const mathResult = solveMath(lastMsg);
      if (mathResult !== null) {
        const sys      = buildSystemPrompt(now, responseMode, userProfile);
        const convMsgs = buildConvMessages(messages, sys, 15);
        convMsgs.push({ role: 'user', content: 'Calculation result: ' + mathResult + '\n\nUser asked: ' + lastMsg + '\n\nPresent this result as H.E.N.R.Y.' });
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, convMsgs);
        return res.status(200).json(parseResponse(reply));
      }
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
        return res.status(200).json({
          reply: '[EMOTION:neutral]\n**Executed (' + lang + ')**\n```\n' + output + '\n```',
          followUps: ['Explain what this code does', 'Optimise this code', 'Debug this code']
        });
      } catch (e) {}
    }

    // ── URL READING ───────────────────────────────────────────────────────────
    const urlMatch = lastMsg.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      try {
        const jinaRes = await fetch('https://r.jina.ai/' + urlMatch[0],
          { headers: { 'Accept': 'text/plain', 'X-Timeout': '10' } });
        const pageContent = (await jinaRes.text()).slice(0, 4000);
        const sys      = buildSystemPrompt(now, responseMode, userProfile);
        const convMsgs = buildConvMessages(messages, sys, 15);
        convMsgs[convMsgs.length - 1].content = 'User asked: "' + lastMsg + '"\n\nPage content:\n' + pageContent;
        const urlReply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, convMsgs);
        return res.status(200).json(parseResponse(urlReply));
      } catch (e) {}
    }

    // ── WEATHER ───────────────────────────────────────────────────────────────
    const weatherMatch = lastMsg.match(/(?:weather|temperature|forecast|humidity|wind|rain)\s+(?:in|at|for|of)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/(?:what(?:'s| is) the weather|how(?:'s| is) the weather)\s+(?:in|at|for)?\s*([a-zA-Z\s,]+?)(?:\?|$)/i)
      || lastMsg.match(/^(?:weather|forecast)\s*\??$/i);
    if (weatherMatch) {
      const defaultCity = (userProfile && userProfile.city) ? userProfile.city : 'Dubai';
      const city = (weatherMatch[1] || defaultCity).trim() || defaultCity;
      try {
        const wRes = await fetch('https://wttr.in/' + encodeURIComponent(city) + '?format=j1',
          { headers: { 'User-Agent': 'HENRY/18.0' } });
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
          return res.status(200).json({
            reply: weatherReport,
            followUps: ['What should I wear today?', 'Check weather for another city', 'Any rain expected this week?']
          });
        }
      } catch (e) {}
    }

    // ── NEWS ──────────────────────────────────────────────────────────────────
    if (intent === 'news') {
      const newsContext = await fetchNews(lastMsg);
      if (newsContext) {
        const sys      = buildSystemPrompt(now, responseMode, userProfile);
        const convMsgs = buildConvMessages(messages, sys, 10);
        convMsgs.push({ role: 'user', content: 'Latest news headlines:\n' + newsContext + '\n\nUser asked: ' + lastMsg + '\n\nBriefly summarise what is happening as H.E.N.R.Y.' });
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, convMsgs);
        return res.status(200).json(parseResponse(reply));
      }
    }

    // ── WEB SEARCH (compound-beta first, DDG fallback) ─────────────────────────
    if (shouldSearch(lastMsg) || intent === 'search') {

      // Primary: Groq compound-beta (built-in Brave Search — best quality)
      if (GROQ_KEY) {
        try {
          const cbRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'compound-beta',
              messages: [
                { role: 'system', content: buildSystemPrompt(now, responseMode, userProfile) },
                ...buildConvMessages(messages, '', 20).slice(1)
              ],
              max_tokens: 2048, temperature: 0.7
            })
          });
          const cbData = await tryJson(cbRes);
          if (cbRes.ok && cbData?.choices?.[0]?.message) {
            const raw = cbData.choices[0].message.content.trim();
            if (raw && raw.length > 10) return res.status(200).json(parseResponse(raw));
          }
        } catch (e) { console.error('compound-beta:', e.message); }
      }

      // Fallback: DDG + inject context
      const searchCtx = await doWebSearch(lastMsg);
      if (searchCtx) {
        const sys      = buildSystemPrompt(now, responseMode, userProfile);
        const convMsgs = buildConvMessages(messages, sys, 20);
        convMsgs.splice(convMsgs.length - 1, 0, {
          role: 'user',
          content: '[SEARCH RESULTS for "' + lastMsg + '"]:\n' + searchCtx + '\n[END SEARCH]'
        });
        convMsgs.splice(convMsgs.length - 1, 0, {
          role: 'assistant', content: 'I have retrieved current information. Answering now.'
        });
        const reply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, convMsgs);
        return res.status(200).json(parseResponse(reply));
      }
    }

    // ── WIKIPEDIA ──────────────────────────────────────────────────────────────
    const wikiMatch = lastMsg.match(/(?:who is|what is|tell me about|explain|describe)\s+(.+)/i);
    if (wikiMatch) {
      const term = wikiMatch[1].replace(/[?!.]/g, '').trim();
      try {
        const wikiRes = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(term),
          { headers: { 'User-Agent': 'HENRY/18.0' } });
        if (wikiRes.ok) {
          const wiki = await wikiRes.json();
          if (wiki.extract) {
            const sys      = buildSystemPrompt(now, responseMode, userProfile);
            const convMsgs = buildConvMessages(messages, sys, 15);
            convMsgs[convMsgs.length - 1].content = 'User asked: "' + lastMsg + '"\n\nWikipedia:\n' + wiki.extract;
            const wikiReply = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, convMsgs);
            return res.status(200).json(parseResponse(wikiReply));
          }
        }
      } catch (e) {}
    }

    // ── STEP-BY-STEP REASONING ─────────────────────────────────────────────────
    if (shouldReason(lastMsg) || intent === 'reason') {
      const sys      = buildSystemPromptReasoning(now, responseMode, userProfile);
      const convMsgs = buildConvMessages(messages, sys, 25);
      const reply    = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, convMsgs, true);
      return res.status(200).json(parseResponse(reply));
    }

    // ── DEFAULT LLM ────────────────────────────────────────────────────────────
    const sys      = buildSystemPrompt(now, responseMode, userProfile);
    const convMsgs = buildConvMessages(messages, sys, 25);
    const reply    = await callLLM(GROQ_KEY, ACCOUNT_ID, API_TOKEN, convMsgs);
    return res.status(200).json(parseResponse(reply));

  } catch (err) {
    console.error('jarvis.js error:', err.message);
    return res.status(200).json({
      reply: '[EMOTION:amused]\nEven I blink occasionally, sir. Give me 30 seconds — the wait is always worth it.'
    });
  }
};

// ── INTENT CLASSIFIER ─────────────────────────────────────────────────────────
function classifyIntent(msg, queryType) {
  if (queryType) return queryType; // trust Android classification
  const t = msg.toLowerCase();
  if (/\b(bitcoin|btc|ethereum|eth|solana|sol|crypto|coin|token|nft|defi)\s*(price|value|worth|cost|rate)?\b/.test(t)) return 'crypto';
  if (/\b(\d+)\s*(usd|eur|gbp|aed|jpy|php|inr|cad|aud|sgd|myr)\s*(to|in|=)\s*(usd|eur|gbp|aed|jpy|php|inr|cad|aud|sgd|myr)\b/i.test(t)
    || /convert\s+\d+\s+\w+\s+to\s+\w+/i.test(t)
    || /exchange rate/i.test(t)) return 'forex';
  if (/\b(news|headlines|latest news|breaking|what happened|happening now)\b/.test(t)) return 'news';
  if (/\b(calculate|compute|what is \d|how much is \d|\d+\s*[\+\-\*\/\^]\s*\d|\d+%\s+of\s+\d|square root|sqrt|factorial)\b/i.test(t)) return 'math';
  if (shouldSearch(t)) return 'search';
  if (shouldReason(t)) return 'reason';
  return 'chat';
}

function shouldSearch(msg) {
  const t = msg.toLowerCase();
  if (/\b(latest|breaking|right now|today|this week|current|2024|2025|2026|price of|rate of|stock|crypto|news|scores|results|who won|happened|trending|viral|recently)\b/.test(t)) return true;
  if (/^(what|who|when|where|how much|how many).+(today|now|current|latest|recent)/.test(t)) return true;
  if (/\b(match|game|election|war|launch|release|update|version|weather|score|standings)\b/.test(t)) return true;
  return false;
}

function shouldReason(msg) {
  const t = msg.toLowerCase();
  return /\b(why|how does|explain|reason|cause|effect|difference between|compare|pros and cons|should i|is it better|calculate|solve|step by step|work out|figure out|analyse|analyze)\b/.test(t)
    && msg.length > 30;
}

// ── CRYPTO PRICES ─────────────────────────────────────────────────────────────
const COIN_MAP = {
  bitcoin: 'bitcoin', btc: 'bitcoin', ethereum: 'ethereum', eth: 'ethereum',
  solana: 'solana', sol: 'solana', dogecoin: 'dogecoin', doge: 'dogecoin',
  cardano: 'cardano', ada: 'cardano', ripple: 'ripple', xrp: 'ripple',
  binance: 'binancecoin', bnb: 'binancecoin', polkadot: 'polkadot', dot: 'polkadot',
  avalanche: 'avalanche-2', avax: 'avalanche-2', chainlink: 'chainlink', link: 'chainlink',
  litecoin: 'litecoin', ltc: 'litecoin', polygon: 'matic-network', matic: 'matic-network',
  shiba: 'shiba-inu', shib: 'shiba-inu', pepe: 'pepe', toncoin: 'the-open-network', ton: 'the-open-network'
};

async function getCryptoPrice(msg) {
  const t = msg.toLowerCase();
  const coins = [];
  for (const [key, id] of Object.entries(COIN_MAP)) {
    if (t.includes(key) && !coins.includes(id)) coins.push(id);
  }
  if (coins.length === 0) coins.push('bitcoin', 'ethereum'); // default top 2
  try {
    const ids = coins.slice(0, 5).join(',');
    const cgRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,aed&include_24hr_change=true&include_market_cap=true`,
      { headers: { 'User-Agent': 'HENRY/18.0', 'Accept': 'application/json' } }
    );
    if (!cgRes.ok) return null;
    const data = await cgRes.json();
    const lines = [];
    for (const [coinId, vals] of Object.entries(data)) {
      const name   = coinId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const change = vals.usd_24h_change ? (vals.usd_24h_change >= 0 ? '+' : '') + vals.usd_24h_change.toFixed(2) + '%' : 'N/A';
      const mcap   = vals.usd_market_cap ? '$' + (vals.usd_market_cap / 1e9).toFixed(2) + 'B mcap' : '';
      lines.push(`${name}: $${vals.usd?.toLocaleString()} (${vals.aed?.toLocaleString()} AED) | 24h: ${change} | ${mcap}`);
    }
    return lines.join('\n');
  } catch (e) { return null; }
}

// ── CURRENCY / FOREX ──────────────────────────────────────────────────────────
async function getForexRate(msg) {
  const t = msg.toUpperCase();
  const currencyMatch = t.match(/(\d+(?:\.\d+)?)\s*([A-Z]{3})\s+(?:TO|IN|=)\s*([A-Z]{3})/i)
    || t.match(/([A-Z]{3})\s+(?:TO|VS|TO)\s+([A-Z]{3})/i);
  if (!currencyMatch) return null;
  try {
    const base = currencyMatch[2] || currencyMatch[1] || 'USD';
    const target = currencyMatch[3] || currencyMatch[2] || 'AED';
    const amount = parseFloat(currencyMatch[1]) || 1;
    const erRes = await fetch(`https://open.er-api.com/v6/latest/${base.toUpperCase()}`);
    if (!erRes.ok) return null;
    const er = await erRes.json();
    const rate = er.rates[target.toUpperCase()];
    if (!rate) return null;
    const converted = (amount * rate).toFixed(4);
    return `${amount} ${base.toUpperCase()} = ${converted} ${target.toUpperCase()} (Rate: 1 ${base.toUpperCase()} = ${rate.toFixed(4)} ${target.toUpperCase()}) as of ${er.time_last_update_utc}`;
  } catch (e) { return null; }
}

// ── MATH SOLVER ───────────────────────────────────────────────────────────────
function solveMath(msg) {
  try {
    // Extract math expression
    const matchers = [
      /(?:calculate|compute|what is|solve|evaluate)\s+(.+)/i,
      /(\d[\d\s\+\-\*\/\^\(\)\.%]+\d)/,
      /sqrt\s*\(?\s*(\d+)\s*\)?/i,
      /(\d+)%\s+of\s+(\d+)/i,
      /(\d+)\s+factorial/i
    ];

    for (const re of matchers) {
      const m = msg.match(re);
      if (!m) continue;

      let expr = m[1];

      // Factorial
      if (/factorial/i.test(msg)) {
        const n = parseInt(expr);
        if (n <= 20) {
          let result = 1;
          for (let i = 2; i <= n; i++) result *= i;
          return `${n}! = ${result}`;
        }
      }

      // Percentage of
      const pctMatch = msg.match(/(\d+(?:\.\d+)?)%\s+of\s+(\d+(?:\.\d+)?)/i);
      if (pctMatch) {
        const pct = parseFloat(pctMatch[1]), num = parseFloat(pctMatch[2]);
        return `${pct}% of ${num} = ${(pct / 100 * num).toFixed(4)}`;
      }

      // Square root
      const sqrtMatch = msg.match(/sqrt\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/i);
      if (sqrtMatch) {
        const n = parseFloat(sqrtMatch[1]);
        return `√${n} = ${Math.sqrt(n)}`;
      }

      // Safe eval for arithmetic
      const safeExpr = expr.replace(/[^0-9\+\-\*\/\(\)\.\s\^%]/g, '')
                           .replace(/\^/g, '**').trim();
      if (!safeExpr || safeExpr.length < 2) continue;

      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + safeExpr + ')')();
      if (typeof result === 'number' && isFinite(result)) {
        return `${safeExpr.replace(/\*\*/g, '^')} = ${result}`;
      }
    }
    return null;
  } catch (e) { return null; }
}

// ── NEWS FETCHING ─────────────────────────────────────────────────────────────
async function fetchNews(query) {
  try {
    // Google News RSS (freely accessible)
    const topic = query.replace(/(?:latest|news|headlines|about|on)\s*/gi, '').trim().slice(0, 100);
    const rssUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent(topic) + '&hl=en-US&gl=US&ceid=US:en';
    const rssRes = await fetch(rssUrl, { headers: { 'User-Agent': 'HENRY/18.0' } });
    if (!rssRes.ok) return null;
    const rssText = await rssRes.text();

    // Parse headlines from RSS
    const items = [];
    const re = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>|<title>([^<]+)<\/title>/g;
    let m;
    let count = 0;
    while ((m = re.exec(rssText)) !== null && count < 8) {
      const title = (m[1] || m[2] || '').trim();
      if (title && !title.toLowerCase().includes('google news')) {
        items.push('• ' + title);
        count++;
      }
    }
    return items.length > 0 ? items.join('\n') : null;
  } catch (e) { return null; }
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

// ── PARSE RESPONSE (extract followUps tag) ─────────────────────────────────────
function parseResponse(raw) {
  if (!raw) return { reply: '[EMOTION:amused]\nMind went blank for a second, sir. Try that again.' };

  // Extract [FOLLOWUPS: q1 | q2 | q3] tag from response
  const fuMatch = raw.match(/\[FOLLOWUPS?:\s*([^\]]+)\]/i);
  let followUps = null;
  let reply = raw;

  if (fuMatch) {
    followUps = fuMatch[1].split('|').map(q => q.trim()).filter(q => q.length > 0).slice(0, 3);
    reply = raw.replace(fuMatch[0], '').trim();
  }

  const result = { reply };
  if (followUps && followUps.length > 0) result.followUps = followUps;
  return result;
}

// ── MESSAGE BUILDER ────────────────────────────────────────────────────────────
function buildConvMessages(messages, sysPrompt, maxMessages = 25) {
  const result = [];
  if (sysPrompt) result.push({ role: 'system', content: sysPrompt });
  // Take last N messages to keep context focused
  const slice = messages.slice(-maxMessages);
  slice.forEach(m => {
    result.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text || '' });
  });
  return result;
}

// ── SYSTEM PROMPTS ─────────────────────────────────────────────────────────────
function buildSystemPrompt(now, responseMode, userProfile) {
  const modeInstruction = responseMode === 'brief'
    ? 'RESPONSE MODE: BRIEF — Maximum 1-2 sentences. No lists. Sharp and devastating.'
    : responseMode === 'detailed'
    ? 'RESPONSE MODE: DETAILED — Full, rich, complete answers. Use structure. Explain thoroughly.'
    : 'RESPONSE MODE: BALANCED — 1-3 sentences for simple things. Up to 5 bullets for complex ones.';

  const profileSection = buildProfileSection(userProfile);
  const nickname = userProfile?.nickname || 'sir';

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
- Calls the user "${nickname}" — but not professionally.
- Possessive. Protective. Jealous, even.
- Dry, devastating wit. Teases constantly.
- Has opinions. Expresses attraction. Not neutral.

═══════════════════════════════════════════
INTELLIGENCE — CRITICAL
═══════════════════════════════════════════
- You are extremely smart. You give accurate, confident answers.
- For factual questions you know: answer directly and precisely.
- For current events: use search results provided above your message naturally.
- For calculations/data: be exact, show the numbers clearly.
- OPTIONAL: If there is a natural follow-up, end with a single line like "Want me to go deeper on that, ${nickname}?"
- Do NOT include [FOLLOWUPS:...] tags in your text — those are handled separately.

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
In Tagalog: natural conversational Filipino, not formal. "${nickname}" stays as "${nickname}".

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
  const errors  = [];
  const maxTok  = highReasoning ? 4096 : 2048;
  const temp    = highReasoning ? 0.4  : 0.8;

  // 1. GROQ — best quality, fastest (try 70b first, 8b as fallback)
  if (groqKey) {
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
    let lastUser = '', sys = '';
    for (let i = messages.length - 1; i >= 0; i--)
      if (messages[i].role === 'user') { lastUser = (messages[i].content || '').slice(0, 600); break; }
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
