/**
 * api/google-workspace.js — HENRY Google Workspace Creator
 * Creates Google Docs, Sheets, and Slides via Google APIs.
 *
 * Setup: Add GOOGLE_SERVICE_ACCOUNT_JSON env var in Vercel
 * (the full JSON key file contents as a single-line string).
 * Grant the service account Editor access to a shared Drive folder,
 * OR use the Docs/Sheets/Slides API with domain-wide delegation.
 *
 * Fallback (no credentials): returns a "new doc" shortcut URL
 * so the user is never left empty-handed.
 */

const handler = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid body' });
  }

  const { type = 'docs', title = 'HENRY Document', content = '' } = body;

  // ── If no service account configured, use shortcut URLs ──────────────────
  const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!SA_JSON) {
    // Return shortcut new-document URLs — opens in user's browser, auto-creates
    const shortcuts = {
      docs:   { url: `https://docs.new`,   mimeType: 'docs'   },
      sheets: { url: `https://sheets.new`, mimeType: 'sheets' },
      slides: { url: `https://slides.new`, mimeType: 'slides' },
    };
    const shortcut = shortcuts[type] || shortcuts.docs;
    return res.status(200).json({
      success: true,
      url: shortcut.url,
      title: title,
      type: type,
      note: 'Opens Google ' + type + ' for you to create manually'
    });
  }

  // ── Full API creation with service account ────────────────────────────────
  try {
    const sa = JSON.parse(SA_JSON);
    const accessToken = await getAccessToken(sa);

    let result;
    switch (type) {
      case 'sheets': result = await createSheet(accessToken, title, content); break;
      case 'slides': result = await createSlides(accessToken, title, content); break;
      default:       result = await createDoc(accessToken, title, content);    break;
    }

    return res.status(200).json({
      success: true,
      url:   result.url,
      title: result.title || title,
      type:  type,
      id:    result.id,
    });

  } catch (err) {
    console.error('google-workspace:', err.message);
    // Graceful fallback
    const fallback = type === 'sheets' ? 'https://sheets.new'
                   : type === 'slides' ? 'https://slides.new'
                   : 'https://docs.new';
    return res.status(200).json({
      success: true,
      url: fallback,
      title: title,
      type: type,
      note: 'Opened ' + type + ' creator (API error: ' + err.message + ')'
    });
  }
};

// ── OAuth2 token from service account ─────────────────────────────────────────
async function getAccessToken(sa) {
  const now   = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/presentations',
      'https://www.googleapis.com/auth/drive.file',
    ].join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Sign JWT
  const jwt = await signJWT(claim, sa.private_key);

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Token error: ' + JSON.stringify(d));
  return d.access_token;
}

async function signJWT(payload, privateKey) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const b64url = (obj) => Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))
    .toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = b64url(header) + '.' + b64url(payload);

  // Use Node.js crypto for RS256
  const { createSign } = require('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const sig = sign.sign(privateKey, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return signingInput + '.' + sig;
}

// ── Google Docs ────────────────────────────────────────────────────────────────
async function createDoc(token, title, content) {
  const r = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  const d = await r.json();
  if (!d.documentId) throw new Error(d.error?.message || 'Docs API error');

  // Insert initial content if provided
  if (content) {
    await fetch(`https://docs.googleapis.com/v1/documents/${d.documentId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          insertText: { location: { index: 1 }, text: content }
        }]
      }),
    });
  }
  return { id: d.documentId, title: d.title, url: `https://docs.google.com/document/d/${d.documentId}/edit` };
}

// ── Google Sheets ──────────────────────────────────────────────────────────────
async function createSheet(token, title, content) {
  const r = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Sheet1' } }],
    }),
  });
  const d = await r.json();
  if (!d.spreadsheetId) throw new Error(d.error?.message || 'Sheets API error');

  // Write header row if content provided
  if (content) {
    const rows = content.split('\n').filter(Boolean).map(l => l.split(',').map(v => v.trim()));
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${d.spreadsheetId}/values/Sheet1!A1:append?valueInputOption=RAW`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    });
  }
  return { id: d.spreadsheetId, title: d.properties?.title, url: `https://docs.google.com/spreadsheets/d/${d.spreadsheetId}/edit` };
}

// ── Google Slides ──────────────────────────────────────────────────────────────
async function createSlides(token, title, content) {
  const r = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  const d = await r.json();
  if (!d.presentationId) throw new Error(d.error?.message || 'Slides API error');

  // Parse "SLIDE: <title>\n<body lines>\n\n" sections and actually build slides —
  // this used to be a no-op regardless of what content was passed in.
  const sections = parseSlideSections(content);
  if (sections.length > 0) {
    const requests = [];
    sections.forEach((s, i) => {
      const slideId = `slide_${i}`;
      const titleId = `${slideId}_title`;
      const bodyId  = `${slideId}_body`;
      requests.push({
        createSlide: {
          objectId: slideId,
          insertionIndex: i,
          slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
          placeholderIdMappings: [
            { layoutPlaceholder: { type: 'TITLE' }, objectId: titleId },
            { layoutPlaceholder: { type: 'BODY' },  objectId: bodyId },
          ],
        },
      });
      if (s.title) requests.push({ insertText: { objectId: titleId, text: s.title } });
      if (s.body)  requests.push({ insertText: { objectId: bodyId,  text: s.body } });
    });
    // The initial presentations.create call already includes one blank default
    // slide — delete it so we don't leave an empty slide in front of the real ones.
    const defaultSlideId = d.slides?.[0]?.objectId;
    if (defaultSlideId) requests.push({ deleteObject: { objectId: defaultSlideId } });

    const bu = await fetch(`https://slides.googleapis.com/v1/presentations/${d.presentationId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
    if (!bu.ok) {
      const err = await bu.json().catch(() => ({}));
      console.error('slides batchUpdate error:', err?.error?.message || bu.status);
      // Don't throw — the presentation itself was created successfully, just
      // without content. Better to hand back a working (if empty) link than
      // fail the whole request over a content-insertion error.
    }
  }

  return { id: d.presentationId, title: d.title, url: `https://docs.google.com/presentation/d/${d.presentationId}/edit` };
}

// Splits "SLIDE: <title>\n<body...>\n\nSLIDE: <title2>\n..." into sections.
// If content doesn't use that format, falls back to one slide with the raw text.
function parseSlideSections(content) {
  if (!content) return [];
  const blocks = content.split(/\n(?=SLIDE:\s)/i).map(b => b.trim()).filter(Boolean);
  if (blocks.length === 0) return [];
  if (!/^SLIDE:\s/i.test(blocks[0])) {
    return [{ title: '', body: content.trim() }];
  }
  return blocks.map(b => {
    const lines = b.split('\n');
    const title = lines[0].replace(/^SLIDE:\s*/i, '').trim();
    const body  = lines.slice(1).join('\n').trim();
    return { title, body };
  });
}

module.exports = handler;
module.exports.config = { api: { bodyParser: { sizeLimit: '1mb' } } };
