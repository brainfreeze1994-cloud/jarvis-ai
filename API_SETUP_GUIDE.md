# 🔧 HENRY API Setup Guide

## Fix "Server error 500" - Environment Variables Configuration

The "Server returned invalid response (not JSON). Status: 500" error occurs when required API keys are missing. Follow these steps to fix it:

---

## ✅ Step 1: Get Your Groq API Key (REQUIRED)

HENRY needs at least ONE AI provider to work. Groq is the primary recommendation.

### How to get Groq API Key:

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Navigate to **API Keys** in the left sidebar
4. Click **Create API Key**
5. Give it a name (e.g., "HENRY Production")
6. **Copy the key immediately** - you won't see it again!
7. It will look like: `gsk_xxxxxxxxxxxxxxxxxxxx`

---

## ✅ Step 2: Configure Vercel Environment Variables

1. Go to your Vercel Dashboard: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your HENRY project
3. Click **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. Click **Add New**

### Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `GROQ_API_KEY` | `gsk_your_actual_key_here` | ✅ Production, ✅ Preview, ✅ Development |
| `NODE_ENV` | `production` | ✅ Production, ✅ Preview |

**Optional** (for advanced features):

| Name | Value | Environment |
|------|-------|-------------|
| `CF_ACCOUNT_ID` | Your Cloudflare Account ID | ✅ Production, ✅ Preview |
| `CF_API_TOKEN` | Your Cloudflare API Token | ✅ Production, ✅ Preview |
| `TAVILY_API_KEY` | Your Tavily API Key | ✅ Production, ✅ Preview |

6. Click **Save** for each variable

---

## ✅ Step 3: Redeploy

After adding environment variables:

1. Go to **Deployments** tab in Vercel
2. Click on the latest deployment
3. Click **Redeploy** (or push a new commit to trigger automatic redeployment)

```bash
# Or manually trigger redeploy from command line
git add .
git commit -m "Fix: improved error handling and logging"
git push
```

---

## ✅ Step 4: Test the API

### Option A: Test via Browser Console

1. Open your HENRY app in browser
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Type "hello" and press Enter
5. Check the **Network** tab for `/api/jarvis` request
6. Click on the request and check the **Response** tab

### Option B: Test via curl

```bash
curl -X POST https://your-domain.vercel.app/api/jarvis \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","text":"hello"}]}'
```

**Expected Response:**
```json
{
  "reply": "Hello! How can I assist you today, sir?",
  "emotion": "neutral"
}
```

**If you still see errors**, check the response - it should now include helpful debug information.

---

## 🐛 Debugging Tips

### Check Vercel Logs

1. Go to your Vercel project
2. Click **Deployments**
3. Click on the latest deployment
4. Click **View Logs** or **Function Logs**
5. Look for error messages starting with `[HENRY API Error:]` or `[callLLM model attempt failed:]`

### Common Issues & Solutions

#### Issue 1: "no groq key"
- **Solution**: Make sure `GROQ_API_KEY` is set correctly in Vercel
- Check for typos in the variable name (must be exact)
- Ensure no extra spaces in the value

#### Issue 2: "Invalid API Key"
- **Solution**: Regenerate your Groq API key
- Make sure you copied the entire key (no missing characters)
- Check if the key has been revoked

#### Issue 3: "timeout" errors
- **Solution**: This is temporary - HENRY will automatically try fallback models
- If persistent, check your network/firewall settings

#### Issue 4: Still getting HTML instead of JSON
- **Solution**: This means the API route is returning an error page
- Check Vercel Function Logs for the actual error
- Ensure all environment variables are set

---

## 🎯 What Changed in This Update

### Enhanced Error Handling

1. **Better Error Messages**: All API errors now return valid JSON with helpful messages
2. **Console Logging**: Server-side errors are logged to Vercel logs for debugging
3. **Graceful Fallbacks**: If one AI model fails, HENRY automatically tries others
4. **No More HTML Errors**: All responses are guaranteed to be valid JSON

### Files Updated

- `/api/jarvis.js` - Enhanced error catching and logging
- `/api/speak.js` - Better TTS error handling
- Frontend already has error detection for non-JSON responses

---

## 📞 Still Having Issues?

If you've followed all steps and still see errors:

1. **Check Vercel Function Logs** - they will show the exact error
2. **Verify Environment Variables** - double-check names and values
3. **Test with curl** - isolates frontend vs backend issues
4. **Redeploy** - sometimes a fresh deploy clears cached issues

### Example Debug Output

When you check Vercel logs, you should see something like:

```
[HENRY API Error]: Error: Invalid API key
callLLM model attempt failed: openai/gpt-oss-120b Request failed
compound executed_tools: NONE — answered from memory
```

This tells you exactly which model failed and why!

---

## ✨ Success Indicators

You'll know it's working when:

1. ✅ Saying "hello" returns a friendly greeting
2. ✅ Network tab shows status 200 (not 500)
3. ✅ Response is valid JSON with `reply` and `emotion` fields
4. ✅ No "Server error 500" messages in the UI
5. ✅ Vercel logs show successful model calls

---

**Need more help?** Check the full README.md for detailed setup instructions and troubleshooting guides.
