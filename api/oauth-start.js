// api/oauth-start.js
// Visit this URL once to start the one-time Google consent flow:
// https://jarvis-ai-seven-dun.vercel.app/api/oauth-start
//
// Redirects to Google's consent screen. After you approve, Google sends you
// to /api/oauth-callback with an authorization code, which gets exchanged
// for a refresh token — that refresh token is what makes doc creation work
// as YOU (real Drive quota) instead of as a storage-less service account.

module.exports = async function handler(req, res) {
  const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!CLIENT_ID) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(
      '<h2>GOOGLE_OAUTH_CLIENT_ID not set</h2>' +
      '<p>Add it in Vercel first, then redeploy before visiting this link.</p>'
    );
  }

  // Hard-coded rather than derived from req.headers.host — that was likely
  // producing a slightly different value depending on how Vercel's proxy
  // passes the host through, causing the redirect_uri_mismatch. This must
  // match EXACTLY what's registered in Google Cloud Console.
  const redirectUri = 'https://jarvis-ai-seven-dun.vercel.app/api/oauth-callback';
  const scopes = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive.file',
  ].join(' ');

  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',   // required to get a refresh_token, not just an access_token
    prompt: 'consent',        // forces the consent screen so we get a refresh_token every time
  }).toString();

  res.writeHead(302, { Location: authUrl });
  res.end();
};
