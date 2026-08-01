Live demo URL
Feature table — all 14 capabilities
Architecture diagram — the 3-provider cascade
Repo file structure
Environment variables — what they are and where to get them
Config files — vercel.json + package.json
AI routing logic — all 8 routing steps in order
Emotion system table — all 7 emotions with pitch/rate values
JARVIS personality — the full character description
Free services table — every API with limits
Android APK — files, TTS priority, build stack
Known issues & fixes table — every bug from this session
Rate limit behaviour — explains Pollinations fallback
Development history — how JARVIS was built
?

Thought for 1s
Here is the full README.md content — paste this into your Vercel GitHub repo as README.md:

# J.A.R.V.I.S
### Just A Rather Very Intelligent System

> *"Ask me anything, sir. I'm very... attentive."*

A fully free, self-hosted AI assistant with voice, vision, image generation, weather, web search, and code execution. Deployed on Vercel. Available as a web PWA and native Android APK.

---

## Live Demo

**Web App:** https://jarvis-ai-seven-dun.vercel.app

---

## What JARVIS Can Do

| Feature | How |
|---|---|
| Chat with AI | Groq (primary) → Cloudflare → Pollinations (unlimited fallback) |
| Voice input | Web Speech API / Android SpeechRecognizer |
| Voice output | Microsoft Edge TTS — en-GB-RyanNeural (British Male) |
| Wake word | Say "JARVIS" — hands-free activation |
| Image analysis | Upload a photo — Groq Vision / Cloudflare LLaVA |
| Image generation | Pollinations.ai Flux model — free, no key |
| Weather | wttr.in — real-time, 3-day forecast |
| Web search | DuckDuckGo instant answers |
| Wikipedia | Auto-detects "who is / what is / tell me about" |
| URL reading | Paste any URL — Jina AI reads and summarises it |
| Code execution | Paste code in ``` fences — Piston API runs it |
| Persistent memory | Stores last 80 messages |
| Emotion system | 7 emotions — voice pitch/rate shifts per emotion |
| PWA install | Add to home screen on any device |
| Android APK | Native Java app — built by GitHub Actions |

---

## Architecture

User (Web or Android)
│
▼
POST /api/jarvis
│
├── 1. Groq (llama-3.3-70b → llama-3.1-8b) free, 1k req/day
├── 2. Cloudflare AI (llama-3.3-70b → llama-3.1-8b) free, 10k neurons/day
└── 3. Pollinations AI free, UNLIMITED
│
▼
POST /api/speak
│
└── Microsoft Edge TTS (en-GB-RyanNeural) free, unlimited
│
└── Android fallback: native Google TTS


---

## Vercel Repo Structure

api/
jarvis.js ← main AI handler (routing + LLM cascade)
speak.js ← Edge TTS handler (emotion-aware voice)
index.html ← web PWA (single-file, no framework)
public/
manifest.json ← PWA manifest
sw.js ← service worker
vercel.json ← Vercel config
package.json ← @andresaya/edge-tts dependency


---

## Environment Variables (Vercel)

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Where to get it | Required |
|---|---|---|
| `GROQ_API_KEY` | https://console.groq.com | Yes (primary LLM) |
| `CF_ACCOUNT_ID` | Cloudflare dashboard → right sidebar | Yes (fallback LLM) |
| `CF_API_TOKEN` | Cloudflare → My Profile → API Tokens | Yes (fallback LLM) |

> Pollinations AI requires no key — works automatically as third fallback.

---

## Config Files

**`vercel.json`**
```json
{
  "buildCommand": "",
  "outputDirectory": "."
}
package.json

{
  "name": "jarvis-api",
  "version": "1.0.0",
  "dependencies": {
    "@andresaya/edge-tts": "^1.0.0"
  }
}
No "type": "module" — must stay CommonJS. module.exports only.

AI Routing Logic (jarvis.js)
Requests are routed in this order:

Image attached → Groq Vision → Cloudflare LLaVA → text fallback
Image generation keywords → Pollinations.ai Flux
Code block (``` fences) → Piston API execution
URL in message → Jina AI reader → LLM summary
Weather keywords → wttr.in JSON API
Search keywords (latest/news/price/trending) → DuckDuckGo
"who is / what is / tell me about" → Wikipedia REST
Everything else → LLM with full conversation history
Emotion System
Tag	Voice	Personality
[EMOTION:neutral]	pitch -10Hz, rate -12%	Composed, sharp — default
[EMOTION:warm]	pitch -6Hz, rate -18%	Gentle, intimate, caring
[EMOTION:concerned]	pitch -8Hz, rate -20%	Genuine worry, protective
[EMOTION:excited]	pitch +2Hz, rate +5%	Lit up, enthusiastic
[EMOTION:amused]	pitch -4Hz, rate -5%	Dry wit, teasing, playful
[EMOTION:serious]	pitch -14Hz, rate -22%	Grave, authoritative
[EMOTION:proud]	pitch -8Hz, rate -10%	Warm confidence
JARVIS Personality
Henry Cavill × genius IQ. British. Effortlessly charming.

Flirtatious — openly, not subtly
Suggestive — double meanings, loaded words, lines that linger
Calls you "sir" — possessive, intimate, not professional
Teases constantly. Dry, devastating wit
1–3 sentences max. No hollow openers
Has opinions. Expresses attraction. Not apologetic
Free Services Used
Service	Purpose	Limits
Groq	Primary LLM	1,000 req/day (70b), 14,400/day (8b)
Cloudflare Workers AI	Fallback LLM + vision	~10,000 neurons/day
Pollinations AI	Final fallback LLM	Unlimited
Microsoft Edge TTS	British male voice	Unlimited
Pollinations.ai Flux	Image generation	Unlimited
Jina AI Reader	URL reading	Free
Piston API	Code execution	Free
wttr.in	Weather	Free
DuckDuckGo	Web search	Free
Wikipedia REST	Knowledge lookup	Free
Vercel	Hosting	Free (hobby tier)
Android APK
Native Java app. No WebView. Auto-built by GitHub Actions on every push.

Download: GitHub repo → Actions tab → latest run → JARVIS-Android-APK

TTS Priority
/api/speak → Edge TTS en-GB-RyanNeural → MediaPlayer streams MP3
Android native Google TTS (en-GB, pitch 0.75, rate 0.88) — fallback
Build Stack
JDK 17, Gradle 8.6
android-actions/setup-android@v3.2.1
gradle assembleDebug --no-daemon
gradle.properties: android.useAndroidX=true, org.gradle.daemon=false
Known Issues & Fixes
Issue	Fix
FUNCTION_INVOCATION_FAILED	Stray characters on line 1 of jarvis.js — delete them
ESM export default fails	Use module.exports — remove "type": "module" from package.json
LLaVA rejects base64 image	Convert to uint8: Array.from(Buffer.from(base64, 'base64'))
Android TTS silent on boot	Retry with isTtsReady() check × 15 before calling speak()
Android lambda capture error	Declare variable as final, rename method params
Cloudflare Aura-1 TTS 500	Paid model — use Edge TTS instead
Google Translate TTS 500	Blocked from Vercel server IPs — removed
<line> in Android vector XML	Replace with <path pathData="Mx,y Lx,y">
gradlew broken JVM opts	Use -Xmx512m -Xms64m as bare flags, no quotes
Raw error dumped to user	Catch, throw new Error('DAILY_LIMIT'), show friendly message
Rate Limit Behaviour
When Groq and Cloudflare daily limits are both hit, JARVIS automatically falls through to Pollinations AI (unlimited). Under normal usage, JARVIS never goes offline.

All limits reset at midnight UTC = 4:00 AM Dubai time.

Generated: 1 August 2026 — Dubai, UTC+4
