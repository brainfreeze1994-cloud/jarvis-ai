# H.E.N.R.Y. Troubleshooting Guide

## Server Error 500 - Common Causes & Solutions

### 1. Missing Environment Variables
**Symptom:** "System error: Server error 500" when saying hello

**Cause:** API keys not configured in environment variables

**Solution:**
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual API keys in `.env`:
   - `GROQ_API_KEY` - Required for AI responses
   - `CF_ACCOUNT_ID` and `CF_API_TOKEN` - For Cloudflare Workers
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` - For Google Workspace integration

3. Redeploy to Vercel after updating environment variables

### 2. API Route Errors
**Check logs:**
- Vercel Dashboard → Project → Functions → View logs
- Look for errors in `/api/jarvis` function

**Common issues:**
- Invalid JSON in request body
- Missing required environment variables
- API rate limits exceeded

### 3. Build Issues
**Symptom:** npm ci fails with lock file errors

**Solution:**
```bash
rm package-lock.json
npm install --legacy-peer-deps
git add package-lock.json
git commit -m "Fix: regenerate lock file"
```

### 4. Node.js Version Mismatch
**Symptom:** EBADENGINE warnings about unsupported Node version

**Solution:**
- Project requires Node.js 18.x
- Vercel automatically uses correct version based on package.json
- Local development: use nvm to switch to Node 18

### 5. Debugging Tips

**Browser Console:**
- Open DevTools (F12)
- Check Console tab for client-side errors
- Look for failed fetch requests to `/api/jarvis`

**Network Tab:**
- Check status codes on `/api/jarvis` requests
- 500 = Server error (check Vercel logs)
- 401 = Missing/invalid API key
- 404 = API route not found

**Vercel Logs:**
```bash
vercel logs [your-project-name]
```

### 6. Quick Test
After deploying, test the API directly:
```bash
curl -X POST https://your-domain.vercel.app/api/jarvis \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","text":"hello"}]}'
```

Expected response:
```json
{"reply":"Hello! How can I assist you today?"}
```

## Contact
For additional support, check:
- GitHub Issues
- Vercel Documentation
- Groq API Documentation
