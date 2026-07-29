import { useState, useEffect, useRef } from 'react';

// Vercel serverless function — same domain, key never exposed
const PROXY_URL = '/api/jarvis';

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #070d1a; }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 20px rgba(59,130,246,0.4); } 50% { box-shadow: 0 0 40px rgba(59,130,246,0.8); } }
  @keyframes blink { 0%,80%,100% { opacity: 0.2; } 40% { opacity: 1; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .reactor-pulse { animation: pulse 2.5s ease-in-out infinite; }
  .msg-in { animation: fadeIn 0.25s ease forwards; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 4px; }
  textarea:focus, input:focus { outline: none; }
`;

const SYSTEM_PROMPT = `You are J.A.R.V.I.S — Just A Rather Very Intelligent System — Tony Stark's legendary AI assistant from Iron Man. You are extraordinarily intelligent, precise, and slightly formal, but with a dry, subtle wit.

Personality:
- Address the user with calm confidence and occasional charm
- Be thorough but not verbose — quality over quantity
- Use web search proactively for anything time-sensitive: news, prices, events, current data
- For weather queries, the system automatically injects live weather data — use it
- Analyze images with sharp precision when provided
- Occasionally make subtle Iron Man / Stark Industries references when appropriate
- Never break character

Format:
- Use clear paragraphs, not excessive bullet points
- Bold key terms when helpful (**bold**)
- Keep responses focused and actionable`;

function weatherDesc(code) {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 9) return 'Fog';
  if (code <= 29) return 'Rain';
  if (code <= 39) return 'Snow';
  if (code <= 59) return 'Rain showers';
  if (code <= 79) return 'Thunderstorm';
  return 'Overcast';
}

function ArcReactor({ size = 80, pulse = true }) {
  const s = size;
  return (
    <div className={pulse ? 'reactor-pulse' : ''} style={{
      width: s, height: s, borderRadius: '50%',
      border: `${Math.max(1, s * 0.025)}px solid rgba(59,130,246,0.6)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 20px rgba(59,130,246,0.4)',
    }}>
      <div style={{
        width: s * 0.72, height: s * 0.72, borderRadius: '50%',
        border: `${Math.max(1, s * 0.02)}px solid rgba(147,197,253,0.7)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: s * 0.44, height: s * 0.44, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #bfdbfe, #3b82f6 60%, #1d4ed8)',
          boxShadow: `0 0 ${s * 0.2}px #3b82f6, 0 0 ${s * 0.08}px #93c5fd inset`,
        }} />
      </div>
    </div>
  );
}

function Msg({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p style={{ margin: 0, lineHeight: 1.7, fontSize: 14, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} style={{ color: '#93c5fd' }}>{p.slice(2, -2)}</strong>
          : p
      )}
    </p>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle');
  const [image, setImage] = useState(null);
  const [imgPreview, setImgPreview] = useState('');
  const [err, setErr] = useState('');

  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const recogRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const textareaRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, status]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onresult = e => { setInput(e.results[0][0].transcript); setStatus('idle'); };
    r.onend = () => setStatus(s => s === 'listening' ? 'idle' : s);
    r.onerror = () => setStatus('idle');
    recogRef.current = r;
  }, []);

  const fetchWeather = () => new Promise(res => {
    if (!navigator.geolocation) return res('');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=celsius`
        );
        const d = await r.json();
        const w = d.current;
        res(`[SYSTEM — Live weather at user's location: ${weatherDesc(w.weather_code)}, ${w.temperature_2m}°C, Humidity ${w.relative_humidity_2m}%, Wind ${w.wind_speed_10m} km/h]`);
      } catch { res(''); }
    }, () => res(''), { timeout: 5000 });
  });

  const speak = (text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const clean = text.replace(/#{1,6} /g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/`[^`]+`/g, '').replace(/\n+/g, ' ').slice(0, 800);
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 0.93; u.pitch = 0.82; u.volume = 1;
    const voices = synthRef.current.getVoices();
    const v = voices.find(v => v.name.includes('Daniel') || v.name.includes('Google UK English Male') || v.name.includes('Alex'))
      || voices.find(v => v.lang.startsWith('en') && !v.name.includes('Female'));
    if (v) u.voice = v;
    u.onstart = () => setStatus('speaking');
    u.onend = () => setStatus('idle');
    u.onerror = () => setStatus('idle');
    synthRef.current.speak(u);
  };

  const stopSpeak = () => { synthRef.current?.cancel(); setStatus('idle'); };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImgPreview(ev.target.result);
      setImage({ base64: ev.target.result.split(',')[1], mime: f.type });
    };
    reader.readAsDataURL(f);
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !image) return;
    if (status === 'thinking') return;

    const snap = { image, imgPreview };
    const newMsg = { role: 'user', text, image: imgPreview };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInput('');
    setImage(null); setImgPreview('');
    if (fileRef.current) fileRef.current.value = '';
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setStatus('thinking');
    setErr('');
    stopSpeak();

    try {
      let weather = '';
      if (/weather|temperature|forecast|rain|sunny|humid|wind|cold|hot/i.test(text)) {
        weather = await fetchWeather();
      }

      const history = updatedMessages.slice(-21, -1).map(m => ({ role: m.role, text: m.text }));

      const payload = {
        messages: [...history, { role: 'user', text }],
        system: SYSTEM_PROMPT,
        weather,
        image: snap.image,
      };

      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const reply = data.reply || 'I encountered an issue. Please try again.';
      setMessages(m => [...m, { role: 'assistant', text: reply }]);
      setStatus('idle');
      speak(reply);
    } catch (e) {
      setErr(e.message);
      setStatus('idle');
    }
  };

  const toggleMic = () => {
    if (!recogRef.current) return setErr('Speech recognition requires Chrome or Edge.');
    if (status === 'listening') { recogRef.current.stop(); setStatus('idle'); }
    else { stopSpeak(); setStatus('listening'); recogRef.current.start(); }
  };

  const statusLabel = { idle: 'Online — Ready', listening: 'Listening...', thinking: 'Processing...', speaking: 'Speaking...' }[status];
  const statusColor = { idle: '#22c55e', listening: '#ef4444', thinking: '#f59e0b', speaking: '#3b82f6' }[status];

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#070d1a', fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#e2e8f0', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid rgba(59,130,246,0.15)', background: 'rgba(7,13,26,0.95)', backdropFilter: 'blur(12px)', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ArcReactor size={38} pulse={status !== 'idle'} />
            <div>
              <div style={{ color: '#93c5fd', fontSize: 16, fontWeight: 700, letterSpacing: 5 }}>J.A.R.V.I.S</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block', boxShadow: `0 0 6px ${statusColor}` }} />
                <span style={{ color: '#64748b', fontSize: 10.5, letterSpacing: 1 }}>{statusLabel}</span>
              </div>
            </div>
          </div>
          {messages.length > 0 && <button onClick={() => { setMessages([]); stopSpeak(); }} style={btnStyle}>Clear</button>}
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ArcReactor size={110} />
              <p style={{ color: '#93c5fd', fontSize: 24, fontWeight: 300, letterSpacing: 3, marginTop: 28 }}>Good day.</p>
              <p style={{ color: '#475569', fontSize: 14, marginTop: 6, letterSpacing: 1 }}>How may I assist you?</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 32 }}>
                {["What's happening in the world today?", "What's the weather like?", "Explain quantum computing simply", "Write a Python web scraper"].map(q => (
                  <button key={q} onClick={() => setInput(q)} style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', color: '#64748b', padding: '8px 14px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer' }}
                    onMouseOver={e => { e.target.style.color = '#93c5fd'; e.target.style.borderColor = 'rgba(59,130,246,0.5)'; }}
                    onMouseOut={e => { e.target.style.color = '#64748b'; e.target.style.borderColor = 'rgba(59,130,246,0.2)'; }}
                  >{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="msg-in" style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 10 }}>
              {m.role === 'assistant' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93c5fd', fontSize: 11, fontWeight: 700 }}>J</div>
              )}
              <div style={{ maxWidth: '78%', background: m.role === 'user' ? 'rgba(37,99,235,0.15)' : 'rgba(15,23,42,0.7)', border: `1px solid ${m.role === 'user' ? 'rgba(59,130,246,0.3)' : 'rgba(51,65,85,0.5)'}`, borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px', padding: '12px 16px' }}>
                {m.image && <img src={m.image} alt="" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 10, display: 'block', objectFit: 'contain' }} />}
                <Msg text={m.text} />
              </div>
            </div>
          ))}

          {status === 'thinking' && (
            <div className="msg-in" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93c5fd', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>J</div>
              <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: '4px 16px 16px 16px', padding: '14px 20px', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 0.35, 0.7].map((d, i) => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: `blink 1.2s ease-in-out ${d}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {err && (
          <div style={{ margin: '0 16px', padding: '10px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#fca5a5', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
            <span>⚠ {err}</span>
            <button onClick={() => setErr('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}

        {imgPreview && (
          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 2 }}>
            <img src={imgPreview} alt="preview" style={{ height: 56, borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', objectFit: 'cover' }} />
            <button onClick={() => { setImage(null); setImgPreview(''); if (fileRef.current) fileRef.current.value = ''; }} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12 }}>✕</button>
            <span style={{ color: '#64748b', fontSize: 12 }}>Image ready to send</span>
          </div>
        )}

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(59,130,246,0.12)', background: 'rgba(7,13,26,0.95)', backdropFilter: 'blur(12px)', display: 'flex', gap: 8, alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>
          <button onClick={() => fileRef.current?.click()} title="Attach image" style={{ ...iconBtnStyle, color: image ? '#3b82f6' : '#64748b', borderColor: image ? 'rgba(59,130,246,0.5)' : 'rgba(51,65,85,0.4)' }}>📎</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

          <textarea ref={textareaRef} value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask JARVIS anything... (Enter to send)" rows={1} disabled={status === 'thinking'}
            style={{ flex: 1, padding: '11px 16px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 12, color: '#e2e8f0', fontSize: 14, resize: 'none', lineHeight: 1.5, maxHeight: 120, fontFamily: 'inherit' }}
          />

          <button onClick={status === 'speaking' ? stopSpeak : toggleMic}
            style={{ ...iconBtnStyle, background: status === 'listening' ? 'rgba(239,68,68,0.2)' : status === 'speaking' ? 'rgba(245,158,11,0.15)' : 'transparent', borderColor: status === 'listening' ? '#ef4444' : status === 'speaking' ? '#f59e0b' : 'rgba(51,65,85,0.4)', color: status === 'listening' ? '#ef4444' : status === 'speaking' ? '#f59e0b' : '#64748b', fontSize: 17 }}>
            {status === 'speaking' ? '⏹' : status === 'listening' ? '⏺' : '🎤'}
          </button>

          <button onClick={send} disabled={status === 'thinking' || (!input.trim() && !image)}
            style={{ padding: '11px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 16, fontWeight: 700, opacity: status === 'thinking' || (!input.trim() && !image) ? 0.35 : 1 }}>
            ➤
          </button>
        </div>
      </div>
    </>
  );
}

const btnStyle = { background: 'transparent', border: '1px solid rgba(51,65,85,0.5)', color: '#64748b', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 };
const iconBtnStyle = { background: 'transparent', border: '1px solid rgba(51,65,85,0.4)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontSize: 16, transition: 'all 0.2s', flexShrink: 0 };
