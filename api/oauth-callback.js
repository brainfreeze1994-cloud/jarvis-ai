// api/oauth-callback.js
// Google redirects here after you approve the consent screen. Exchanges the
// one-time authorization code for a refresh_token, then displays it so you
// can copy it into Vercel as GOOGLE_REFRESH_TOKEN. This page is only ever
// seen by you, once — after that, HENRY uses the stored refresh token
// automatically without you visiting this page again.

module.exports = async function handler(req, res) {
  const { code, error } = req.query;
  res.setHeader('Content-Type', 'text/html');

  if (error) {
    return res.status(400).send(`<h2>Authorization failed</h2><p>${escapeHtml(error)}</p>`);
  }
  if (!code) {
    return res.status(400).send('<h2>No authorization code received</h2><p>Start over from /api/oauth-start.</p>');
  }

  const CLIENT_ID     = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  // Must be byte-identical to the redirectUri used in oauth-start.js and to
  // what's registered in Google Cloud Console — hard-coded for that reason.
  const REDIRECT_URI = 'https://jarvis-ai-seven-dun.vercel.app/api/oauth-callback';

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(400).send('<h2>Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET</h2><p>Add both in Vercel, redeploy, then start over from /api/oauth-start.</p>');
  }

  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const d = await r.json();

    if (!d.refresh_token) {
      return res.status(400).send(`
        <h2>No refresh token in the response</h2>
        <p>This almost always means you've authorized this app before and Google is reusing
        the old grant. Revoke it first at
        <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a>
        (find "HENRY" or your OAuth client's name, remove access), then
        <a href="/api/oauth-start">try again</a>.</p>
        <pre>${escapeHtml(JSON.stringify(d, null, 2))}</pre>
      `);
    }

    return res.status(200).send(`
      <html><body style="font-family:monospace;background:#0d0d0d;color:#3ddc84;padding:2rem;max-width:640px;margin:0 auto;">
        <h2>✅ Success — one more step</h2>
        <p>Copy the value below into Vercel:</p>
        <p><b>jarvis-ai → Settings → Environment Variables → Add New</b></p>
        <p><b>Name:</b> <code>GOOGLE_REFRESH_TOKEN</code></p>
        <p><b>Value:</b></p>
        <textarea style="width:100%;height:90px;background:#000;color:#3ddc84;font-family:monospace;padding:10px;border:1px solid #3ddc84;"
          readonly onclick="this.select()">${escapeHtml(d.refresh_token)}</textarea>
        <p>Apply to Production, save, then redeploy. After that, doc/sheet/slide creation is fully
        automatic — this page never needs to be visited again unless you revoke access.</p>
      </body></html>
    `);
  } catch (err) {
    return res.status(500).send(`<h2>Error</h2><pre>${escapeHtml(err.message)}</pre>`);
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
