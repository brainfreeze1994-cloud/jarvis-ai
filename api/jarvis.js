async function callLLM(accountId, apiToken, messages) {
  const models = [
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/meta/llama-3.1-8b-instruct'
  ];

  let lastError = '';
  for (const model of models) {
    try {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, max_tokens: 2048 })
        }
      );
      const text = await cfRes.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { lastError = 'Parse error: ' + text.slice(0, 100); continue; }
      if (cfRes.ok && data.success && data.result?.response) {
        return data.result.response.trim();
      }
      lastError = data.errors?.[0]?.message || `Model ${model} failed`;
    } catch (e) {
      lastError = e.message;
    }
  }
  throw new Error(lastError || 'All models failed');
}
And replace the catch block at the bottom of the handler with:

  } catch (err) {
    console.error('jarvis.js error:', err.message);
    return res.status(200).json({
      reply: `My apologies, sir. My neural systems encountered a temporary fault: ${err.message}. Please try again momentarily.`
    });
  }
