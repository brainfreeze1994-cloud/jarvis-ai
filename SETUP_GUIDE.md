# 🔧 H·E·N·R·Y Setup Guide - Fix Server 500 Error

## ⚠️ CRITICAL: You MUST add environment variables or HENRY won't respond!

### The Problem
When you say "hello" and get **"System error: Server returned invalid response (not JSON). Status: 500"**, it's because the **GROQ_API_KEY** environment variable is missing in your Vercel deployment.

### ✅ Solution: Add Environment Variables in Vercel

1. **Get Your Groq API Key** (Required):
   - Go to https://console.groq.com
   - Sign up or log in
   - Navigate to **API Keys** section
   - Click **Create API Key**
   - Copy the key (starts with `gsk_...`)

2. **Add to Vercel**:
   - Go to your Vercel Dashboard: https://vercel.com/dashboard
   - Select your H·E·N·R·Y project
   - Click **Settings** → **Environment Variables**
   - Click **Add New**
   - Add these variables:

   | Variable Name | Value | Environments |
   |--------------|-------|--------------|
   | `GROQ_API_KEY` | Your Groq key (e.g., `gsk_xxxxx`) | Production, Preview, Development |
   | `NODE_ENV` | `production` | Production |

3. **Optional Variables** (for advanced features):
   - `CF_ACCOUNT_ID` - Cloudflare Account ID (for image analysis fallback)
   - `CF_API_TOKEN` - Cloudflare API Token
   - `TAVILY_API_KEY` - For web search capabilities

4. **Redeploy**:
   - After adding environment variables, trigger a new deployment:
   ```bash
   git add .
   git commit -m "Fix: Added environment variable validation"
   git push
   ```
   - Or manually redeploy from Vercel dashboard

### 🧪 Test Your Deployment

After deploying with the GROQ_API_KEY set, test the API directly:

```bash
curl -X POST https://your-domain.vercel.app/api/jarvis \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","text":"hello"}]}'
```

**Expected Response:**
```json
{
  "reply": "[EMOTION:warm] Hello, sir! How can I assist you today?",
  "emotion": "warm"
}
```

### 🐛 Still Getting Errors?

Check Vercel logs:
1. Go to your project in Vercel
2. Click **Deployments**
3. Click on the latest deployment
4. Click **Function Logs**
5. Look for errors related to `GROQ_API_KEY` or API calls

Common issues:
- **Missing GROQ_API_KEY**: Add it in Vercel settings
- **Invalid API Key**: Regenerate your key at console.groq.com
- **Rate Limits**: Check your Groq account usage limits

### 📝 What Was Fixed

The code now includes:
1. ✅ Explicit check for missing GROQ_API_KEY with helpful error message
2. ✅ Better error logging to help debug issues
3. ✅ Graceful fallback when AI services are unavailable
4. ✅ Always returns valid JSON, never HTML error pages
5. ✅ Improved content-type validation

---

**Need Help?** Check the full TROUBLESHOOTING.md file for more detailed debugging steps.
