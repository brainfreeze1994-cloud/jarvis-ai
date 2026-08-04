[README.md](https://github.com/user-attachments/files/30723397/README.md)
# H·E·N·R·Y
### Hyperintelligence Engine Neural Reasoning Yield

> An AI assistant with voice, vision, memory, brain training, and live data — built entirely on free services. No subscription. No credit card.

---

## What is H·E·N·R·Y?

HENRY is a full-stack AI assistant available as:
- **Web App** — deployed on Vercel (Progressive Web App, installable)
- **Android APK** — native app with camera, voice, and device control

HENRY speaks, listens, sees, remembers, and thinks. He uses a cascade of free AI providers so he is always available even when one service is at its daily limit.

---

## Features at a Glance

| Category | Capabilities |
|---|---|
| 🧠 **AI Chat** | Groq LLaMA 70B → 8B → Cloudflare → Pollinations → OpenRouter cascade |
| 🎙 **Voice** | Speech recognition + Microsoft Edge TTS neural voices (British, American, Filipino, French) |
| 👁 **Vision** | Image analysis, object detection, text extraction, animal identification |
| 🌍 **Earth Map** | Interactive 3D globe — click any country for intel briefing |
| 🐾 **Animal Scanner** | Upload a photo → species, habitat, conservation status |
| 🧠 **Brain Modules** | Mental Imagery, Neural Plasticity, DMN, Sensory Engine, Memory Banks |
| 💾 **Smart Memory** | HENRY auto-learns facts about you and remembers them across sessions |
| 🌦 **Live Data** | Weather, crypto prices, forex, gold/oil prices, news, web search |
| 📄 **Google Workspace** | Create Docs, Sheets, Slides via voice or text |
| 🎵 **Image Generation** | Pollinations.ai Flux model — free, unlimited |
| 🌐 **Web Search** | DuckDuckGo live search injected into every relevant answer |
| 🔊 **Emotion System** | 7 emotions (warm, excited, amused, concerned, serious, proud, neutral) — voice pitch/rate shifts per emotion |
| 🌏 **Bilingual** | Replies in English or Filipino/Tagalog depending on your message |
| 📱 **PWA** | Installable on home screen from any browser |

---

## Architecture

```
┌─────────────────────────────────────────┐
│           User (Web or Android)         │
└──────────────┬──────────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────┐
│         Vercel Serverless               │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  api/jarvis │  │  api/speak.js    │  │
│  │  (AI brain) │  │  (Edge TTS)      │  │
│  └──────┬──────┘  └──────────────────┘  │
└─────────┼───────────────────────────────┘
          │
          ▼ AI Provider Cascade
┌─────────────────────────────────────────┐
│  1. Groq  llama-3.3-70b (1,000/day)     │
│  2. Groq  llama-3.1-8b  (14,400/day)   │
│  3. Cloudflare Workers AI               │
│  4. Pollinations.ai (unlimited)         │
│  5. OpenRouter (free tier)              │
└─────────────────────────────────────────┘
```

---

## File Structure

```
vercel-repo/
├── index.html          ← Full web app (single file)
├── vercel.json         ← Vercel config (routes, timeouts)
├── package.json        ← Node dependencies (ws for Edge TTS)
└── api/
    ├── jarvis.js       ← Main AI backend (LLM, vision, search, weather)
    └── speak.js        ← Text-to-speech (Microsoft Edge TTS neural voices)

android-repo/
├── app/src/main/java/com/jarvis/ai/
│   ├── MainActivity.java           ← Core UI + voice + TTS
│   ├── SplashActivity.java         ← Startup screen
│   ├── OrbView.java                ← Animated orb (4 states)
│   ├── HudTickerView.java          ← Scrolling HUD ticker
│   ├── JarvisApi.java              ← Vercel API caller
│   ├── SmartMemory.java            ← Persistent memory system
│   ├── BrainActivity.java          ← Brain module hub
│   ├── MentalImageryActivity.java  ← Guided visualizations
│   ├── NeuralPlasticityActivity.java ← Brain training
│   ├── DefaultModeNetworkActivity.java ← DMN reflection
│   ├── SensorySubstitutionActivity.java ← Cross-modal perception
│   ├── VisionActivity.java         ← Live camera AI vision
│   ├── GoogleWorkspaceHelper.java  ← Docs/Sheets/Slides
│   └── [60+ more feature classes]
└── app/src/main/res/
    ├── layout/         ← XML layouts
    └── drawable/       ← Icons, shapes, backgrounds
```

---

## Environment Variables (Vercel)

Set these in your Vercel project → Settings → Environment Variables:

| Variable | Where to get it | Required |
|---|---|---|
| `GROQ_API_KEY` | console.groq.com → API Keys | Yes |
| `CF_ACCOUNT_ID` | dash.cloudflare.com → Account Home | Yes |
| `CF_API_TOKEN` | dash.cloudflare.com → My Profile → API Tokens | Yes |
| `OPENROUTER_API_KEY` | openrouter.ai → Keys | Optional |

---

## Free API Limits (Daily)

| Provider | Model | Daily Limit |
|---|---|---|
| Groq | llama-3.3-70b-versatile | 1,000 requests |
| Groq | llama-3.1-8b-instant | 14,400 requests |
| Cloudflare | llama-3.3-70b-instruct-fp8-fast | Pay-per-use (very cheap) |
| Pollinations | mistral-nemo | Unlimited |
| Edge TTS | Neural voices | Unlimited |
| wttr.in | Weather | Unlimited |
| DuckDuckGo | Web search | Unlimited |
| Pollinations | Image generation (Flux) | Unlimited |

---

## Deployment

### Web (Vercel)

1. Fork or clone this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add environment variables (see above)
4. Deploy — your app will be live at `your-project.vercel.app`

### Android APK

1. Clone the Android repo to GitHub
2. Go to Actions tab → Run workflow → **Build Debug APK**
3. Download the APK artifact
4. Install on your Android device (allow unknown sources)

---

## Voice System

HENRY uses **Microsoft Edge TTS** neural voices served via Vercel:

| Accent | Voice | Character |
|---|---|---|
| 🇬🇧 British Male | en-GB-RyanNeural | Deep, authoritative |
| 🇬🇧 British Female | en-GB-SoniaNeural | Clear, professional |
| 🇺🇸 American Male | en-US-GuyNeural | Warm, conversational |
| 🇺🇸 American Female | en-US-AriaNeural | Friendly, natural |
| 🇵🇭 Filipino Male | fil-PH-AngeloNeural | Native Tagalog |
| 🇵🇭 Filipino Female | fil-PH-BlessicaNeural | Natural Filipino |
| 🇫🇷 French Male | fr-FR-HenriNeural | Sophisticated |
| 🇫🇷 French Female | fr-FR-DeniseNeural | Elegant |

Change voice: tap the **VOICE** button (web) or long-press the trash icon (Android).

---

## Personality

HENRY is modelled after a brilliant, confident, slightly flirtatious British gentleman. He:
- Gives short, punchy answers (1–3 sentences unless asked for detail)
- Uses "sir" naturally
- Has 7 emotional states that shift his voice tone
- Speaks your language — replies in Tagalog if you write in Tagalog
- Remembers facts about you across sessions

---

## Credits

Built with love using entirely free services:
- [Groq](https://groq.com) — LLM inference
- [Cloudflare Workers AI](https://ai.cloudflare.com) — Fallback LLM
- [Microsoft Edge TTS](https://azure.microsoft.com/en-us/products/cognitive-services/text-to-speech/) — Neural voices
- [Pollinations.ai](https://pollinations.ai) — Image generation
- [DuckDuckGo](https://duckduckgo.com) — Web search
- [wttr.in](https://wttr.in) — Weather
- [Three.js](https://threejs.org) — 3D Earth globe
- [Vercel](https://vercel.com) — Hosting & serverless functions

---

*H·E·N·R·Y — Hyperintelligence Engine Neural Reasoning Yield*
