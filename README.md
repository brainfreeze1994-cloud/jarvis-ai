# H·E·N·R·Y™ — Hyperintelligence Engine Neural Reasoning Yield

## 🚀 Overview

H·E·N·R·Y is an advanced AI assistant with multi-modal capabilities including voice interaction, image analysis, real-time data fetching (stocks, weather, earthquakes, space data), and cognitive training modules. Built as a Progressive Web App (PWA) with Android native support.

**Current Version:** v26 — THE BIG BANG UPDATE

### ✨ Key Features

- **Multi-Modal Interaction**: Voice, text, and image input
- **Real-Time Data**: Live stocks, cryptocurrency, weather, earthquakes, NASA/ISS tracking
- **AI Vision**: Image analysis and OCR via Cloudflare LLaVA and Groq vision models
- **Brain Modules**: Cognitive training, visualization, memory exercises
- **Offline-First**: PWA with service worker for offline functionality
- **Multi-Language**: Support for English, Tagalog, French, and more
- **Emotion-Aware**: Detects and responds to user emotional state
- **Chain-of-Thought**: Advanced reasoning with multi-step problem solving

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Voice Commands](#voice-commands)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🏁 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A modern web browser (Chrome recommended)
- API keys for external services (see [Configuration](#configuration))

### 1-Minute Setup

```bash
# Clone the repository
git clone <repository-url>
cd henry

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env

# Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 📦 Installation

### Development Environment

```bash
# Install all dependencies
npm install

# For Android development (optional)
# See docs/android-setup.md for detailed instructions
```

### Production Build

```bash
# Build optimized assets
npm run build

# Preview production build
npm run preview
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

#### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GROQ_API_KEY` | Groq API key for LLM inference | [Groq Console](https://console.groq.com/) |
| `CF_ACCOUNT_ID` | Cloudflare Account ID | Cloudflare Dashboard → Account Home |
| `CF_API_TOKEN` | Cloudflare API Token with Workers permissions | Cloudflare Dashboard → API Tokens |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (server-side) | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | - |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/api/oauth-callback` |
| `GOOGLE_API_KEY` | Google API Key (client-side direct integration) | - |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Development server port | `3000` |

### Getting API Keys

#### Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and save securely

#### Cloudflare Credentials

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Account ID: Found on the right sidebar of the overview page
3. API Token:
   - Go to Profile → API Tokens
   - Create Token → Edit Cloudflare Workers
   - Copy the generated token

---

## 💻 Usage

### Web Application

1. **Start the application**: `npm run dev`
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Install PWA**: Click "Install" or "Add to Home Screen" when prompted
4. **Grant permissions**: Allow microphone access when requested
5. **Start interacting**: 
   - Click the orb or microphone button to speak
   - Type in the input box and press Send
   - Enable wake word mode to say "HENRY"

### Response Modes

HENRY adapts response length based on context or explicit requests:

- **Brief**: Quick facts and one-liners
  - _"Keep it short"_ or _"Brief mode"_
- **Balanced**: Default conversational responses
- **Detailed**: Comprehensive explanations
  - _"Give me details"_ or _"Detailed mode"_

### Attaching Images

1. Click the 📎 paperclip icon
2. Select from gallery or take a photo
3. Ask questions about the image

---

## 🔌 API Reference

### Client-Side API

The main client logic is in `src/js/api-client.js`. Key functions:

#### `sendMessage(message, options)`

Sends a message to HENRY for processing.

**Parameters:**
- `message` (string): The user's input text
- `options` (object, optional):
  - `imageBase64`: Base64-encoded image data
  - `responseMode`: 'brief' | 'balanced' | 'detailed'
  - `enableChainThinking`: boolean

**Returns:** Promise resolving to response object

**Example:**
```javascript
const response = await sendMessage('What is the weather in Dubai?', {
  responseMode: 'detailed'
});
console.log(response.reply);
```

#### `analyzeImage(imageBase64, question)`

Analyzes an image using AI vision.

**Parameters:**
- `imageBase64` (string): Base64-encoded image
- `question` (string): Question about the image

**Returns:** Promise with image analysis

### Server-Side API Endpoints

All endpoints are located in the `/api/` directory.

#### POST `/api/jarvis.js`

Main AI processing endpoint handling all queries.

**Request Body:**
```json
{
  "messages": [{"role": "user", "text": "Hello"}],
  "responseMode": "balanced",
  "userProfile": {"name": "John", "city": "Dubai"},
  "memoryFacts": ["User prefers metric units"],
  "emotionState": "curious"
}
```

**Response:**
```json
{
  "reply": "[EMOTION:warm]\nHello! How can I assist you today?",
  "mood": "friendly",
  "chainThought": null
}
```

#### GET `/api/speak.js`

Text-to-speech endpoint.

**Query Parameters:**
- `text`: Text to convert to speech
- `voice`: Voice accent (optional)

---

## 🎤 Voice Commands

### Weather & Environment

| Command | Action |
|---------|--------|
| "What's the weather?" | Current weather for your location |
| "Weather in Dubai" | Weather for specified city |
| "Will it rain today?" | Rain forecast |
| "3-day forecast for Manila" | Extended forecast |

### Finance & Markets

| Command | Action |
|---------|--------|
| "Bitcoin price" | Live BTC/USD price |
| "AAPL stock" | Apple stock price |
| "Gold price today" | Gold spot price |
| "Convert 100 USD to AED" | Currency conversion |

### Space & Science

| Command | Action |
|---------|--------|
| "Where is the ISS?" | ISS live position |
| "NASA photo of the day" | APOD image and description |
| "Asteroids near Earth" | Near-Earth object data |
| "Explain quantum computing" | Educational explanation |

### Brain & Cognitive Training

| Command | Action |
|---------|--------|
| "Open brain" | Access Brain hub |
| "Start visualization" | Guided mental imagery |
| "Stroop challenge" | Color-word test |
| "Future self simulation" | 5-year visualization |

_For complete command reference, see [HENRY_GUIDE.md](./HENRY_GUIDE.md)_

---

## 🏗 Architecture

### Project Structure

```
/workspace
├── index.html              # Main application entry point
├── package.json            # Dependencies and scripts
├── .env.example            # Environment template
├── README.md               # This file
├── HENRY_GUIDE.md          # Complete user guide
├── api/                    # Server-side functions
│   ├── jarvis.js          # Main AI handler
│   ├── chemistry.js       # Chemistry calculations
│   ├── google-workspace.js # Google API integration
│   └── voice-demo.js      # Voice processing
├── src/
│   ├── css/
│   │   └── styles.css     # Main stylesheet
│   ├── js/
│   │   ├── main.js        # Application core logic
│   │   ├── api-client.js  # API communication layer
│   │   ├── voice.js       # Voice recognition & TTS
│   │   ├── brain.js       # Cognitive modules
│   │   ├── markets.js     # Financial data handlers
│   │   ├── chemistry.js   # Chemistry utilities
│   │   ├── radar.js       # Radar/scan visualizations
│   │   ├── theme.js       # Theme management
│   │   ├── components/    # Reusable UI components
│   │   └── utils/         # Helper functions
│   └── html-body.html     # HTML template partial
├── public/                 # Static assets
│   ├── favicon.ico
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service worker
├── tests/                  # Test suites
└── docs/                   # Additional documentation
```

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Node.js serverless functions (Vercel-compatible)
- **AI/ML**: Groq LLM API, Cloudflare Workers AI
- **Data Sources**:
  - Yahoo Finance (stocks)
  - CoinGecko (cryptocurrency)
  - USGS (earthquakes)
  - NASA APIs (space data)
  - wttr.in (weather)
  - Lyrics.ovh (song lyrics)
- **Voice**: Web Speech API, Google TTS
- **Maps**: CesiumJS 3D globe

### Data Flow

1. User input (voice/text/image) captured in `main.js`
2. Processed by `voice.js` (if voice) or direct text
3. Sent to `api-client.js` which formats the request
4. Serverless function `jarvis.js` processes the query
5. External APIs called as needed (stocks, weather, etc.)
6. AI generates response with appropriate emotion/mode
7. Response displayed and optionally spoken via `voice.js`

---

## 🛠 Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Code Style Guidelines

- Use ES6+ features (const/let, arrow functions, async/await)
- Follow Airbnb JavaScript Style Guide
- Add JSDoc comments for public functions
- Use meaningful variable names
- Keep functions small and focused (< 50 lines ideal)

### Adding New Features

1. **Create feature branch**: `git checkout -b feature/new-feature`
2. **Implement changes** following existing patterns
3. **Add tests** in `/tests` directory
4. **Update documentation** (README, HENRY_GUIDE)
5. **Submit pull request**

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/api-client.test.js

# Run with coverage
npm run test:coverage
```

### Writing Tests

Tests use Jest framework. Example:

```javascript
// tests/utils.test.js
describe('Utility Functions', () => {
  test('should format currency correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});
```

### Test Coverage Goals

- Core utilities: 90%+
- API clients: 80%+
- UI components: 70%+

---

## 🚀 Deployment

### Vercel Deployment

H·E·N·R·Y is optimized for Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Environment Setup on Vercel

1. Go to your project in Vercel Dashboard
2. Settings → Environment Variables
3. Add all variables from `.env.example`
4. Deploy again to apply changes

### Manual Deployment

1. Build the project: `npm run build`
2. Upload `dist/` folder to your hosting provider
3. Configure environment variables on host
4. Set up redirect rules for SPA routing

---

## 🔧 Troubleshooting

### Common Issues

#### No Voice / Silent

**Problem**: HENRY isn't speaking

**Solutions**:
- Check browser microphone/speaker permissions
- Verify volume is not muted
- Try switching voice accent in VOICE settings
- Ensure Google TTS is installed (Android)

#### "All systems resting"

**Problem**: AI quota exceeded

**Solution**: Daily limit reached. Wait a few minutes or hours for reset. HENRY uses a 5-provider cascade to minimize this.

#### Map Not Loading

**Problem**: 3D globe shows blank

**Solutions**:
- Check internet connection
- Allow JavaScript in browser
- Clear browser cache
- Try different browser (Chrome recommended)

#### Image Recognition Fails

**Problem**: Uploaded image not analyzed

**Solutions**:
- Use JPG/PNG format
- Ensure file size < 2MB
- Retry once
- Check Cloudflare API credentials

#### Wake Word Not Working

**Problem**: Saying "HENRY" doesn't activate

**Solutions**:
- Enable wake word mode in settings
- Speak clearly and loudly
- Reduce background noise
- Check microphone permissions

### Debug Mode

Enable debug logging:

```javascript
localStorage.setItem('henry_debug', 'true');
```

Check browser console for detailed logs.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

### How to Contribute

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: Ensure all tests pass
5. **Commit**: Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. **Push** to your branch
7. **Open a Pull Request**

### Contribution Guidelines

- Write clear, documented code
- Add tests for new features
- Update documentation as needed
- Follow existing code style
- Be respectful and inclusive

### Reporting Issues

- Use GitHub Issues
- Provide clear reproduction steps
- Include environment details (browser, OS, version)
- Attach screenshots if applicable

---

## 📄 License

This project is proprietary software. All rights reserved.

© 2026 H·E·N·R·Y Project

**H·E·N·R·Y™** — Hyperintelligence Engine Neural Reasoning Yield™

_Built to be brilliant. Designed to be free._

---

## 📞 Support

- **Documentation**: [HENRY_GUIDE.md](./HENRY_GUIDE.md)
- **Issues**: GitHub Issues
- **Email**: support@henry.ai (placeholder)

---

## 🙏 Acknowledgments

- Groq for ultra-fast LLM inference
- Cloudflare for edge AI capabilities
- NASA for open space data APIs
- USGS for earthquake monitoring
- All open-source contributors

---

**Last Updated**: January 2026  
**Version**: v26
