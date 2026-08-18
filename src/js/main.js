(async () => {
  // ── State ──────────────────────────────────────────────────────────────────
  let appState    = 'idle';
  let history     = [];
  let attachments = [];
  let recognition = null;
  let wakeRecognition = null;
  let wakeEnabled = false;
  const synth       = window.speechSynthesis;
  let deferredPrompt = null;
  let typingRow   = null;
  let currentAccent = localStorage.getItem('henry_accent') || 'british';
  let pendingAccent = currentAccent;

  // Audio visualization
  let audioCtx = null, analyser = null, dataArray = null, micStream = null;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const statusBadge  = document.getElementById('status-badge');
  const rStatus      = document.getElementById('r-status');
  const orbStatus    = document.getElementById('orb-status');
  const mOrbStatus   = document.getElementById('mobile-orb-status');
  const chatArea     = document.getElementById('chat-area');
  const chatInner    = document.getElementById('chat-inner');
  const emptyState   = document.getElementById('empty-state');
  const textInput    = document.getElementById('text-input');
  const sendBtn      = document.getElementById('send-btn');
  const micBtn       = document.getElementById('mic-btn');
  const attachBtn    = document.getElementById('attach-btn');
  const fileInput    = document.getElementById('file-input');
  const attachStrip  = document.getElementById('attach-strip');
  const wakeBtn      = document.getElementById('wake-btn');
  const clearBtn     = document.getElementById('clear-btn');
  const voiceBtn     = document.getElementById('voice-btn');
  const voiceOverlay = document.getElementById('voice-modal-overlay');
  const voiceOptions = document.querySelectorAll('.voice-option');
  const voiceCancelBtn = document.getElementById('voice-cancel-btn');
  const voiceApplyBtn  = document.getElementById('voice-apply-btn');
  const installBanner  = document.getElementById('install-banner');
  const installBtn     = document.getElementById('install-btn');
  const installDismiss = document.getElementById('install-dismiss');

  // Desktop orb canvas
  const orbCanvas   = document.getElementById('orb-canvas');
  // Mobile orb canvas
  const mOrbCanvas  = document.getElementById('mobile-orb-canvas');

  // ── ORBS ANIMATOR ─────────────────────────────────────────────────────────
  class OrbAnimator {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx    = canvas.getContext('2d');
      this.state  = 'idle';
      this.time   = 0;
      this.analyser  = null;
      this.dataArray = null;
      this.animId    = null;
    }
    setState(s) { this.state = s; }
    connectAudio(a, d) { this.analyser = a; this.dataArray = d; }

    start() {
      if (this.animId) {cancelAnimationFrame(this.animId);}
      const loop = () => { this.draw(); this.animId = requestAnimationFrame(loop); };
      loop();
    }
    stop() { if (this.animId) {cancelAnimationFrame(this.animId);} }

    draw() {
      const { ctx, canvas } = this;
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2;
      const r  = Math.min(w, h) * 0.33;
      ctx.clearRect(0, 0, w, h);
      this.time += 0.022;
      if (this.state === 'listening') {this.drawListening(cx, cy, r);}
      else if (this.state === 'thinking') {this.drawThinking(cx, cy, r);}
      else if (this.state === 'speaking') {this.drawSpeaking(cx, cy, r);}
      else if (this.state === 'wake') {this.drawWake(cx, cy, r);}
      else {this.drawIdle(cx, cy, r);}
    }

    // ── IDLE ──
    drawIdle(cx, cy, r) {
      const { ctx, time: t } = this;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.8);

      // Outer rotating dashed rings
      this.ring(cx, cy, r * 1.55, t * 0.25,  '#00d4ff', 0.25, 1, [10,16]);
      this.ring(cx, cy, r * 1.35, -t * 0.15, '#00d4ff', 0.18, 1, [5,20]);

      // Glow
      this.radGlow(cx, cy, r * 1.1, `rgba(0,212,255,${0.04 + 0.04 * pulse})`);

      // Main rings
      this.arc(cx, cy, r,       '#00d4ff', 0.55, 1.5);
      this.arc(cx, cy, r * .68, '#00d4ff', 0.35, 1);
      this.arc(cx, cy, r * .42, '#00d4ff', 0.45, 1.2);

      // Tick marks
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const len = i % 6 === 0 ? 8 : 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a)*(r+2), cy + Math.sin(a)*(r+2));
        ctx.lineTo(cx + Math.cos(a)*(r+len+2), cy + Math.sin(a)*(r+len+2));
        ctx.strokeStyle = `rgba(0,212,255,${i%6===0?0.5:0.2})`;
        ctx.lineWidth = 1; ctx.stroke();
      }

      // Core glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * .38);
      g.addColorStop(0, `rgba(0,212,255,${0.7 + 0.2*pulse})`);
      g.addColorStop(.5, 'rgba(0,80,160,0.5)');
      g.addColorStop(1, 'rgba(0,20,60,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r * .38, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();

      // Center dot
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    }

    // ── LISTENING — gold + real audio bars ──
    drawListening(cx, cy, r) {
      const { ctx, time: t } = this;

      // Get real audio data
      let bars64 = null;
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);
        bars64 = this.dataArray;
      }

      // Pulse rings
      for (let i = 0; i < 3; i++) {
        const phase = ((t * 2 + i * 0.33) % 1);
        const rr = r * (1.05 + phase * 0.7);
        const al = (1 - phase) * 0.5;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(201,168,76,${al})`; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Audio bars around circle
      const numBars = 64;
      for (let i = 0; i < numBars; i++) {
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
        let val;
        if (bars64) {
          const idx = Math.floor(i * bars64.length / numBars);
          val = bars64[idx] / 255;
        } else {
          // Fake animated bars
          val = 0.15 + 0.4 * Math.abs(Math.sin(t * 4 + i * 0.25) * Math.cos(t * 2 + i * 0.1));
        }
        const innerR = r * 1.08;
        const outerR = innerR + val * r * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle)*innerR, cy + Math.sin(angle)*innerR);
        ctx.lineTo(cx + Math.cos(angle)*outerR,  cy + Math.sin(angle)*outerR);
        ctx.strokeStyle = `rgba(201,168,76,${0.35 + val * 0.65})`;
        ctx.lineWidth = 2; ctx.stroke();
      }

      // Rotating ring - fast
      this.ring(cx, cy, r * 1.85, t * 2, '#c9a84c', 0.5, 1, [8,10]);

      // Main rings - gold
      this.arc(cx, cy, r,       '#c9a84c', 0.85, 2);
      this.arc(cx, cy, r * .68, '#c9a84c', 0.5,  1);
      this.arc(cx, cy, r * .42, '#c9a84c', 0.65, 1.5);

      // Core glow - gold
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * .42);
      g.addColorStop(0, 'rgba(255,220,100,1)');
      g.addColorStop(.4, 'rgba(201,168,76,0.7)');
      g.addColorStop(1, 'rgba(80,50,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r * .42, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();

      // Glowing center
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
      ctx.fillStyle = '#ffe980'; ctx.fill();
    }

    // ── THINKING — purple + spinning dashes + orbiting dots ──
    drawThinking(cx, cy, r) {
      const { ctx, time: t } = this;

      // Spinning dashed rings
      for (let i = 0; i < 3; i++) {
        const speed = [1.2, -0.7, 0.4][i];
        const radius = r * [1.5, 1.3, 1.1][i];
        const dash = [[8,10],[5,15],[3,20]][i];
        this.ring(cx, cy, radius, t * speed, '#8b5cf6', 0.5, 1.2, dash);
      }

      // Orbiting dots
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 2.5;
        const dx = cx + Math.cos(angle) * r * 1.15;
        const dy = cy + Math.sin(angle) * r * 1.15;
        ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI*2);
        ctx.fillStyle = `rgba(167,139,250,${0.5 + 0.5 * Math.sin(t * 4 + i)})`; ctx.fill();
      }

      this.arc(cx, cy, r,       '#8b5cf6', 0.75, 2);
      this.arc(cx, cy, r * .68, '#8b5cf6', 0.45, 1);
      this.arc(cx, cy, r * .42, '#8b5cf6', 0.55, 1.5);

      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * .38);
      g.addColorStop(0, 'rgba(210,200,255,1)');
      g.addColorStop(.4, 'rgba(139,92,246,0.7)');
      g.addColorStop(1, 'rgba(40,10,80,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r * .38, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();

      // Spinning inner cross
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 3);
      ctx.strokeStyle = 'rgba(200,180,255,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-r*.25, 0); ctx.lineTo(r*.25, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r*.25); ctx.lineTo(0, r*.25); ctx.stroke();
      ctx.restore();
    }

    // ── SPEAKING — green + waveform ripples ──
    drawSpeaking(cx, cy, r) {
      const { ctx, time: t } = this;

      // Outward ripple waves
      for (let i = 0; i < 4; i++) {
        const phase = ((t * 1.8 + i * 0.25) % 1);
        const rr = r * (1.05 + phase * 1.0);
        const al = (1 - phase) * 0.45;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(22,163,74,${al})`; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Synthetic waveform bars around circle
      const numBars = 48;
      for (let i = 0; i < numBars; i++) {
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
        const val = 0.2 + 0.55 * Math.abs(
          Math.sin(t * 9 + i * 0.5) * Math.cos(t * 3.5 + i * 0.2),
        );
        const innerR = r * 1.07;
        const outerR = innerR + val * r * 0.65;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle)*innerR, cy + Math.sin(angle)*innerR);
        ctx.lineTo(cx + Math.cos(angle)*outerR,  cy + Math.sin(angle)*outerR);
        ctx.strokeStyle = `rgba(74,222,128,${0.35 + val * 0.55})`;
        ctx.lineWidth = 2; ctx.stroke();
      }

      this.ring(cx, cy, r * 1.7, t * 0.9, '#16a34a', 0.45, 1, [8,12]);

      this.arc(cx, cy, r,       '#16a34a', 0.85, 2);
      this.arc(cx, cy, r * .68, '#16a34a', 0.45, 1);
      this.arc(cx, cy, r * .42, '#16a34a', 0.6,  1.5);

      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * .40);
      g.addColorStop(0, 'rgba(180,255,200,1)');
      g.addColorStop(.4, 'rgba(22,163,74,0.7)');
      g.addColorStop(1, 'rgba(0,30,10,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r * .40, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();

      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
      ctx.fillStyle = '#a7f3d0'; ctx.fill();
    }

    // ── WAKE — dim pulse ──
    drawWake(cx, cy, r) {
      const { ctx, time: t } = this;
      const pulse = 0.2 + 0.1 * Math.sin(t * 0.4);
      this.arc(cx, cy, r,       `rgba(0,212,255,${pulse})`, 1, 1);
      this.arc(cx, cy, r * .68, `rgba(0,212,255,${pulse})`, 1, .8);
      this.radGlow(cx, cy, r * .3, `rgba(0,212,255,${pulse * 0.4})`);
    }

    // ── Helpers ──
    arc(cx, cy, r, color, alpha, lw) {
      const { ctx } = this;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.strokeStyle = color.startsWith('rgba') ? color : this.rgba(color, alpha);
      ctx.lineWidth = lw || 1; ctx.stroke();
    }
    ring(cx, cy, r, angle, color, alpha, lw, dash) {
      const { ctx } = this;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
      ctx.strokeStyle = this.rgba(color, alpha);
      ctx.lineWidth = lw || 1;
      if (dash) {ctx.setLineDash(dash);}
      ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    }
    radGlow(cx, cy, r, color) {
      const { ctx } = this;
      const g = ctx.createRadialGradient(cx, cy, r*.3, cx, cy, r);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();
    }
    rgba(hex, alpha) {
      const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
  }

  // Create animators
  const orbAnim  = new OrbAnimator(orbCanvas);
  const mOrbAnim = new OrbAnimator(mOrbCanvas);
  orbAnim.start();
  mOrbAnim.start();

  // ── Audio Visualizer ──────────────────────────────────────────────────────
  async function startAudioViz() {
    try {
      if (!audioCtx) {audioCtx = new (window.AudioContext || window.webkitAudioContext)();}
      if (audioCtx.state === 'suspended') {await audioCtx.resume();}
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const src = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      orbAnim.connectAudio(analyser, dataArray);
      mOrbAnim.connectAudio(analyser, dataArray);
    } catch(e) { /* No mic permission — use fake animation */ }
  }
  function stopAudioViz() {
    if (micStream) { micStream.getTracks().forEach(t=>t.stop()); micStream=null; }
    analyser = null; dataArray = null;
    orbAnim.connectAudio(null, null);
    mOrbAnim.connectAudio(null, null);
  }

  // ── Clock ─────────────────────────────────────────────────────────────────
  function updateClock() {
    const d = new Date();
    const opts = { timeZone:'Asia/Dubai' };
    const timeStr = d.toLocaleTimeString('en-US', { ...opts, hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
    const dateStr = d.toLocaleDateString('en-US', { ...opts, weekday:'short', year:'numeric', month:'short', day:'numeric' });
    const clock = document.getElementById('live-clock');
    const date  = document.getElementById('live-date');
    const rClk  = document.getElementById('r-clock');
    const rDt   = document.getElementById('r-date');
    if (clock) {clock.textContent = timeStr;}
    if (date)  {date.textContent  = dateStr.toUpperCase();}
    if (rClk)  {rClk.textContent  = timeStr;}
    if (rDt)   {rDt.textContent   = dateStr.toUpperCase();}
  }
  updateClock(); setInterval(updateClock, 1000);

  // ── State management ──────────────────────────────────────────────────────
  const STATE_LABELS = {
    idle:'STANDBY', listening:'LISTENING…', thinking:'PROCESSING…', speaking:'SPEAKING…', wake:'WAKE ACTIVE',
  };
  function setState(s) {
    appState = s;
    const lbl = STATE_LABELS[s] || 'STANDBY';

    // All status badges
    [statusBadge].forEach(el => {
      if (!el) {return;}
      el.textContent = lbl;
      el.className = 'status-badge s-' + s;
      // For the element without class, just update
      el.id === 'status-badge' && (el.className = 's-' + s);
    });
    if (rStatus) {rStatus.textContent = lbl;}
    if (orbStatus)  {orbStatus.textContent  = lbl + (s==='idle'?' — CLICK TO SPEAK':'');}
    if (mOrbStatus) {mOrbStatus.textContent = lbl;}

    // Animate both orbs
    orbAnim.setState(s);
    mOrbAnim.setState(s);

    // Mic button state
    [micBtn, document.getElementById('m-mic-btn'), document.getElementById('d-mic-btn')].forEach(b => {
      if (!b) {return;}
      b.classList.toggle('active', s === 'listening');
      if (b.id === 'mic-btn') {b.classList.toggle('mic-on', s === 'listening');}
    });

    sendBtn.disabled = (s === 'thinking');
  }

  // ── History ───────────────────────────────────────────────────────────────
  function saveHistory() {
    const json = JSON.stringify(history.slice(-80));
    try {
      if (window.Android && Android.saveHistory) {Android.saveHistory(json);}
      else {localStorage.setItem('henry_history', json);}
    } catch(e){}
  }
  function loadHistory() {
    try {
      let json = '[]';
      if (window.Android && Android.loadHistory) {json = Android.loadHistory();}
      else {json = localStorage.getItem('henry_history') || localStorage.getItem('jarvis_history') || '[]';}
      history = JSON.parse(json) || [];
    } catch(e){ history=[]; }
    history.slice(-20).forEach(m => renderMsg(m.role, m.text));
    if (history.length > 0) {hideEmpty();}
  }
  function clearMemory() {
    history = [];
    try {
      if (window.Android && Android.clearHistory) {Android.clearHistory();}
      else { localStorage.removeItem('henry_history'); localStorage.removeItem('jarvis_history'); }
    } catch(e){}
    Array.from(chatInner.querySelectorAll('.msg-row,.memory-note')).forEach(el=>el.remove());
    showEmpty();
    addMsg('henry','Memory cleared, sir. We start fresh.');
  }
  function showEmpty() { if(emptyState) {emptyState.style.display='';} }
  function hideEmpty() { if(emptyState) {emptyState.style.display='none';} }

  // ── Rendering ─────────────────────────────────────────────────────────────
  function renderMsg(role, text, imageUrl, imgDataUrls) {
    hideEmpty();
    const row = document.createElement('div');
    row.className = 'msg-row ' + (role === 'user' ? 'user' : 'henry');

    const av = document.createElement('div');
    av.className = 'msg-avatar ' + (role==='user'?'user-av':'henry-av');
    av.textContent = role==='user'?'YOU':'HNR';
    row.appendChild(av);

    const bub = document.createElement('div');
    bub.className = 'msg-bubble';

    if (role === 'user') {
      bub.textContent = text;
      if (imgDataUrls && imgDataUrls.length) {
        const r2 = document.createElement('div'); r2.className='img-thumb-row';
        imgDataUrls.forEach(url => {
          const im = document.createElement('img'); im.src=url; im.onclick=()=>window.open(url);
          r2.appendChild(im);
        });
        bub.appendChild(r2);
      }
    } else {
      bub.innerHTML = marked.parse(text);
      bub.querySelectorAll('a').forEach(a=>a.setAttribute('target','_blank'));
      // Long-press copy
      bub.addEventListener('contextmenu', e => { e.preventDefault(); copyText(text); });
      bub.title = 'Long press / right-click to copy';
      let holdTimer;
      bub.addEventListener('touchstart', () => { holdTimer=setTimeout(()=>copyText(text),600); });
      bub.addEventListener('touchend', () => clearTimeout(holdTimer));
      if (imageUrl) {
        const ld=document.createElement('div'); ld.className='img-loading'; ld.textContent='Generating image…';
        bub.appendChild(ld);
        const img=document.createElement('img'); img.className='henry-img'; img.alt='Generated';
        img.onload=()=>{ ld.remove(); bub.appendChild(img); scrollChat(); };
        img.onerror=()=>{ ld.textContent='Image generation failed.'; };
        img.src=imageUrl;
      }
    }

    row.appendChild(bub);
    chatInner.appendChild(row);
    scrollChat();
    return row;
  }

  function copyText(text) {
    navigator.clipboard && navigator.clipboard.writeText(text).then(()=>{
      const t = document.createElement('div');
      t.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
        +'background:rgba(0,212,255,.15);border:1px solid rgba(0,212,255,.5);'
        +'color:#00d4ff;padding:.5rem 1.5rem;font-size:1.5rem;letter-spacing:.2em;z-index:9999;';
      t.textContent='◈ COPIED';
      document.body.appendChild(t);
      setTimeout(()=>t.remove(), 1200);
    });
  }

  function addMsg(role, text, imageUrl, imgDataUrls) {
    removeTyping();
    return renderMsg(role, text, imageUrl, imgDataUrls);
  }
  function showTyping() {
    removeTyping();
    typingRow = document.createElement('div');
    typingRow.className='msg-row henry';
    typingRow.innerHTML='<div class="msg-avatar henry-av">HNR</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
    chatInner.appendChild(typingRow);
    scrollChat();
  }
  function removeTyping() { if(typingRow){typingRow.remove();typingRow=null;} }
  function scrollChat() { chatArea.scrollTop = chatArea.scrollHeight; }

  window.chipSend = function(el) { askHenry(el.textContent || el.innerText); };

  // Expose speak globally for other scripts
  window.speak = speak;

  // ── Attachments ───────────────────────────────────────────────────────────
  function addAttachment(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const att={ name:file.name, dataUrl:e.target.result, type:file.type };
        attachments.push(att); renderAttPreview(att); resolve();
      };
      reader.readAsDataURL(file);
    });
  }
  function renderAttPreview(att) {
    const thumb=document.createElement('div'); thumb.className='att-thumb';
    if (att.type.startsWith('image/')) {
      const img=document.createElement('img'); img.src=att.dataUrl; thumb.appendChild(img);
    } else {
      const f=document.createElement('div'); f.className='att-file';
      const ext=att.name.split('.').pop().toUpperCase();
      f.innerHTML=`<span>📄</span>${att.name.length>8?att.name.slice(0,8)+'…':att.name}<br><b>${ext}</b>`;
      thumb.appendChild(f);
    }
    const rm=document.createElement('button'); rm.className='att-rm'; rm.textContent='×';
    rm.onclick=()=>{ attachments.splice(attachments.indexOf(att),1); thumb.remove();
      if(!attachments.length) {attachStrip.classList.remove('show');} };
    thumb.appendChild(rm);
    attachStrip.appendChild(thumb);
    attachStrip.classList.add('show');
  }
  function clearAttachments() {
    attachments=[]; attachStrip.innerHTML=''; attachStrip.classList.remove('show');
  }

  // ── Voice-triggered Globe & Animal Scanner ────────────────────────────────
  function checkVoiceTriggers(text) {
    const t = text.toLowerCase();

    // Globe trigger: "show me [country] on the map" / "find [country]" / "where is [country]"
    const mapPatterns = [
      /(?:show|find|locate|open|go to|fly to|zoom to|navigate to)\s+(.+?)\s+on\s+(?:the\s+)?map/i,
      /(?:open|show)\s+(?:the\s+)?(?:map|globe)/i,
      /(?:map|globe)\s+of\s+(.+)/i,
      /(?:where is|show me)\s+(.+?)\s+on\s+(?:the\s+)?globe/i,
    ];
    for (const p of mapPatterns) {
      const m = text.match(p);
      if (m) {
        const country = m[1] || null;
        setTimeout(() => {
          window.openGlobeMap();
          if (country) {
            setTimeout(() => {
              document.getElementById('map-search-input').value = country;
              document.getElementById('map-search-btn').click();
            }, 800);
          }
        }, 400);
        return true;
      }
    }

    // Animal scanner trigger
    if (/(?:scan|identify|what animal|what is this animal|animal scanner)/i.test(text)) {
      setTimeout(() => window.openAnimalScanner(), 400);
      return true;
    }
    return false;
  }

  // ── Ask HENRY ─────────────────────────────────────────────────────────────
  // ── Google Workspace (Docs / Sheets / Slides) creation ──────────────────────
  function isDocCommand(text) {
    const t = text.toLowerCase();
    return /\b(create|make|generate|write)\b.*\b(document|doc|spreadsheet|sheet|excel|slide|slides|presentation|deck)\b/.test(t);
  }
  function detectDocType(text) {
    const t = text.toLowerCase();
    if (/\b(spreadsheet|sheet|excel|csv)\b/.test(t)) {return 'sheets';}
    if (/\b(slide|slides|presentation|powerpoint|deck)\b/.test(t)) {return 'slides';}
    return 'docs';
  }
  function docTypeName(type) {
    return type === 'sheets' ? 'Spreadsheet' : type === 'slides' ? 'Slide Deck' : 'Document';
  }
  function extractDocTitle(text) {
    const m = text.match(/(?:called|titled|named|about|for|on|regarding)\s+["']?(.+?)["']?$/i);
    if (m && m[1]) {return m[1].trim().replace(/\b\w/g, c => c.toUpperCase());}
    return 'HENRY ' + new Date().toLocaleDateString();
  }
  // Pulls just the relevant portion of the chat instead of dumping the whole
  // conversation into every doc — same approach as the Android app.
  function buildExtractionPrompt(title, type) {
    if (type === 'sheets') {
      return `Based on our conversation, extract the relevant data for a spreadsheet titled "${title}". Reply with ONLY CSV — first line column headers, following lines data rows, comma-separated. No commentary, no code fences, no [EMOTION] tag.`;
    }
    if (type === 'slides') {
      return `Based on our conversation, extract the relevant content for a slide deck titled "${title}". Reply using ONLY this format, repeated for each slide:\nSLIDE: <slide title>\n<3-5 short bullet lines>\n\nKeep it focused — only include what's actually relevant, not the whole conversation. No commentary, no [EMOTION] tag.`;
    }
    return `Based on our conversation, extract and write out the content for a document titled "${title}". Include only what's relevant to this — don't dump the whole conversation verbatim. Write clean, well-organized document content in plain text. No commentary, no [EMOTION] tag.`;
  }

  async function tryCreateDoc(userText) {
    const docType  = detectDocType(userText);
    const typeName = docTypeName(docType);
    const title    = extractDocTitle(userText);

    history.push({ role:'user', text:userText });
    addMsg('user', userText);
    saveHistory();
    addMsg('henry', `Creating your ${typeName} titled **"${title}"**…`);
    speak(`Creating your ${typeName} now, sir.`);
    setState('thinking'); showTyping();

    // Throwaway instruction turn — built on a COPY of history so it never
    // gets saved or shown in the visible chat.
    let content = '';
    try {
      const extractionHistory = [...history, { role:'user', text: buildExtractionPrompt(title, docType) }];
      const r = await fetch('/api/jarvis', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ messages: extractionHistory }),
      });
      const d = await r.json();
      content = (d.reply || '').replace(/^\[EMOTION:[^\]]+\]\s*/i, '').trim();
    } catch(e) {
      // Extraction failed — better to hand over the full chat than nothing.
      content = history.map(h => `${h.role === 'user' ? 'You' : 'HENRY'}:\n${h.text}`).join('\n\n');
    }

    try {
      const cr = await fetch('/api/google-workspace', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ type: docType, title, content }),
      });
      const cd = await cr.json();
      removeTyping();
      if (!cd.success) {throw new Error(cd.error || 'creation failed');}

      // No Google service account configured server-side means the backend
      // can only hand back a blank docs.new/sheets.new/slides.new link — it
      // has no way to pre-fill a brand new Google doc's content via URL.
      // Bridge that gap by copying the content to the clipboard.
      const isBlankShortcut = cd.url === 'https://docs.new' || cd.url === 'https://sheets.new' || cd.url === 'https://slides.new';
      if (isBlankShortcut && content) { try { await navigator.clipboard.writeText(content); } catch(e){} }

      const msg = isBlankShortcut
        ? `**${typeName} opened!**\n\nI don't have Google credentials configured yet, so I couldn't create and fill it automatically — but your content is copied to the clipboard. Just paste it in (Ctrl+V).`
        : `**${typeName} created!**\n\nTitle: ${cd.title}\n\n[Open →](${cd.url})`;
      history.push({ role:'model', text: msg }); saveHistory();
      addMsg('henry', msg);
      speak(isBlankShortcut ? 'Opened it, sir — your content\'s on the clipboard, just paste it in.' : `Your ${typeName} is ready, sir. Opening now.`);
      window.open(cd.url, '_blank');
    } catch(err) {
      removeTyping();
      const fallbackUrl = docType === 'sheets' ? 'https://sheets.new' : docType === 'slides' ? 'https://slides.new' : 'https://docs.new';
      if (content) { try { await navigator.clipboard.writeText(content); } catch(e){} }
      const reply = `I'll open ${typeName} for you directly, sir — your content's copied to the clipboard, just paste it in.`;
      history.push({ role:'model', text: reply }); saveHistory();
      addMsg('henry', reply);
      speak(reply);
      window.open(fallbackUrl, '_blank');
    }
    setState('idle');
  }

  // ── Task Manager (web) ───────────────────────────────────────────────────
  function loadTasks() { try { return JSON.parse(localStorage.getItem('henry_tasks') || '[]'); } catch(e) { return []; } }
  function saveTasks(t) { localStorage.setItem('henry_tasks', JSON.stringify(t)); }
  function isTaskCommand(text) {
    const t = text.trim();
    const lower = t.toLowerCase();
    return /^add task[:\s]/i.test(t) || /^(high|medium|low)\s+priority[:\s]/i.test(t) ||
           lower.includes('my tasks') || lower.includes('show tasks') || lower.includes('to-do list') || lower.includes('todo list') ||
           /^(mark|complete)\s+.+/i.test(t) || lower.includes('delete all completed');
  }
  function handleTaskCommand(text) {
    const t = text.trim(), lower = t.toLowerCase();
    let tasks = loadTasks();
    let m = t.match(/^add task[:\s]+(.+)$/i);
    const pm = t.match(/^(high|medium|low)\s+priority[:\s]+(.+)$/i);
    if (m || pm) {
      const title = (m ? m[1] : pm[2]).trim();
      const priority = pm ? pm[1].toUpperCase() : 'MEDIUM';
      const due = title.match(/by\s+(\w+day|\d{4}-\d{2}-\d{2}|tomorrow|today)/i);
      const id = tasks.length ? Math.max(...tasks.map(x=>x.id))+1 : 1;
      tasks.push({ id, title, priority, dueDate: due?due[1]:'', done:false, createdAt: new Date().toISOString().slice(0,10) });
      saveTasks(tasks);
      return `[EMOTION:proud] Added: **${title}**${priority!=='MEDIUM' ? ' ('+priority+' priority)' : ''}, sir.`;
    }
    m = t.match(/^(?:mark|complete)\s+(.+?)(?:\s+done)?$/i);
    if (m) {
      const q = m[1].toLowerCase().trim();
      const task = tasks.find(x => !x.done && x.title.toLowerCase().includes(q));
      if (task) { task.done = true; saveTasks(tasks); return `[EMOTION:proud] Marked **${task.title}** done, sir.`; }
      return `[EMOTION:neutral] Couldn't find an open task matching "${q}", sir.`;
    }
    if (lower.includes('delete all completed')) {
      const before = tasks.length;
      tasks = tasks.filter(x => !x.done); saveTasks(tasks);
      return `[EMOTION:neutral] Cleared ${before - tasks.length} completed task(s), sir.`;
    }
    const open = tasks.filter(x => !x.done);
    if (!open.length) {return '[EMOTION:neutral] No open tasks, sir. Clean slate.';}
    const order = { HIGH:0,MEDIUM:1,LOW:2 };
    open.sort((a,b) => (order[a.priority]??1) - (order[b.priority]??1));
    let out = '[EMOTION:neutral] **Your tasks, sir:**\n\n';
    open.forEach(x => out += `• ${x.title}${x.priority==='HIGH'?' 🔴':x.priority==='LOW'?' 🔵':''}${x.dueDate?' — due '+x.dueDate:''}\n`);
    return out;
  }

  // ── Habit Tracker (web) ──────────────────────────────────────────────────
  function loadHabits() { try { return JSON.parse(localStorage.getItem('henry_habits') || '[]'); } catch(e) { return []; } }
  function saveHabits(h) { localStorage.setItem('henry_habits', JSON.stringify(h)); }
  function isHabitCommand(text) {
    const t = text.toLowerCase();
    return /^add habit[:\s]/i.test(text.trim()) || /^mark\s+.+\s+done$/i.test(text.trim()) ||
           t.includes('my streaks') || t.includes('habit report') || t.includes('my habits');
  }
  function todayCompact() { return new Date().toISOString().slice(0,10).replace(/-/g,''); }
  function handleHabitCommand(text) {
    const t = text.trim(), lower = t.toLowerCase();
    const habits = loadHabits();
    let m = t.match(/^add habit[:\s]+(.+)$/i);
    if (m) {
      const name = m[1].trim();
      if (habits.find(h => h.name.toLowerCase() === name.toLowerCase()))
      {return `[EMOTION:neutral] Already tracking "${name}", sir.`;}
      habits.push({ name, streak:0, best:0, lastDone:'', totalDays:0 });
      saveHabits(habits);
      return `[EMOTION:proud] Now tracking **${name}**, sir. Say "mark ${name} done" each day.`;
    }
    m = t.match(/^mark\s+(.+?)\s+done$/i);
    if (m) {
      const q = m[1].toLowerCase();
      const h = habits.find(x => x.name.toLowerCase().includes(q));
      if (!h) {return `[EMOTION:neutral] Not tracking a habit matching "${q}", sir.`;}
      const today = todayCompact();
      if (h.lastDone === today) {return `[EMOTION:neutral] Already marked **${h.name}** done today, sir.`;}
      h.streak = (h.streak||0) + 1;
      h.best = Math.max(h.best||0, h.streak);
      h.lastDone = today; h.totalDays = (h.totalDays||0) + 1;
      saveHabits(habits);
      return `[EMOTION:proud] **${h.name}** — ${h.streak}-day streak, sir. 🔥`;
    }
    if (!habits.length) {return '[EMOTION:neutral] No habits tracked yet, sir. Try "add habit: gym".';}
    let out = '[EMOTION:neutral] **Your streaks, sir:**\n\n';
    habits.forEach(h => out += `• ${h.name} — ${h.streak}-day streak (best ${h.best})\n`);
    return out;
  }

  // ── Protocols (web) — same design as Android: replay stored commands
  // through askHenry() so it supports everything HENRY already understands ──
  function loadProtocols() { try { return JSON.parse(localStorage.getItem('henry_protocols') || '[]'); } catch(e) { return []; } }
  function saveProtocols(p) { localStorage.setItem('henry_protocols', JSON.stringify(p)); }
  function isProtocolCreateCommand(text) { return /^(create|make|new|set up)\s+protocol\b/i.test(text.trim()); }
  function isProtocolListCommand(text) {
    const t = text.toLowerCase();
    return t.includes('my protocols') || t.includes('list protocols') || t === 'protocols';
  }
  function isProtocolDeleteCommand(text) { return /^delete\s+protocol\b/i.test(text.trim()); }
  function matchProtocolRun(text) {
    const t = text.trim();
    const m = t.match(/^(?:run|start|activate|protocol:?)\s+(.+)$/i);
    const candidate = m ? m[1].trim() : t;
    const protocols = loadProtocols();
    const found = protocols.find(p => p.name.toLowerCase() === candidate.toLowerCase() || p.name.toLowerCase() === t.toLowerCase());
    return found ? found.name : null;
  }
  function createProtocol(text) {
    const rest = text.trim().replace(/^(create|make|new|set up)\s+protocol\s*/i, '').trim();
    const colon = rest.indexOf(':');
    if (colon < 0) {return '[EMOTION:neutral] I need a name and steps, sir — try "create protocol Movie Night: dim brightness, silent mode, open Netflix".';}
    const name = rest.slice(0, colon).trim();
    const steps = rest.slice(colon+1).split(',').map(s=>s.trim()).filter(Boolean);
    if (!name || !steps.length) {return '[EMOTION:neutral] I need both a name and at least one step, sir.';}
    let protocols = loadProtocols();
    protocols = protocols.filter(p => p.name.toLowerCase() !== name.toLowerCase());
    protocols.push({ name, steps });
    saveProtocols(protocols);
    let out = `[EMOTION:proud] **Protocol "${name}" saved, sir.**\n\n${steps.length} step${steps.length!==1?'s':''}:\n`;
    steps.forEach((s,i) => out += `${i+1}. ${s}\n`);
    out += `\nSay "run ${name}" whenever you want it.`;
    return out;
  }
  function listProtocols() {
    const protocols = loadProtocols();
    if (!protocols.length) {return '[EMOTION:neutral] No protocols saved yet, sir. Try "create protocol Morning: check weather, my tasks, daily briefing".';}
    let out = '[EMOTION:neutral] **Your Protocols, sir:**\n\n';
    protocols.forEach(p => out += `🔹 **${p.name}** — ${p.steps.length} step${p.steps.length!==1?'s':''}\n`);
    return out;
  }
  function deleteProtocol(text) {
    const name = text.trim().replace(/^delete\s+protocol\s*/i, '').trim();
    let protocols = loadProtocols();
    const before = protocols.length;
    protocols = protocols.filter(p => p.name.toLowerCase() !== name.toLowerCase());
    saveProtocols(protocols);
    return protocols.length < before
      ? `[EMOTION:neutral] Protocol "${name}" deleted, sir.`
      : `[EMOTION:neutral] Couldn't find a protocol called "${name}", sir.`;
  }
  async function runProtocol(name) {
    const protocols = loadProtocols();
    const p = protocols.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!p) {return;}
    const announce = `**Running "${name}", sir** — ${p.steps.length} step${p.steps.length!==1?'s':''}.`;
    history.push({ role:'model', text: announce }); saveHistory();
    addMsg('henry', announce);
    speak(`Running ${name}, sir.`);
    for (let i = 0; i < p.steps.length; i++) {
      await new Promise(r => setTimeout(r, 3500));
      await askHenry(p.steps[i]);
    }
  }

  // ── Daily Briefing (web) ─────────────────────────────────────────────────
  function isBriefingCommand(text) {
    const t = text.toLowerCase();
    return t.includes('morning briefing') || t.includes('daily briefing') || t.includes('brief me') ||
           t.includes('my briefing') || t.includes('what\'s my day look like') || t.includes('give me a rundown');
  }
  async function fetchBriefingWeather() {
    try {
      const r = await safeFetch('https://wttr.in/Dubai?format=%C+%t+%h+💧');
      const txt = r ? await r.text() : null;
      return txt ? txt.trim() : null;
    } catch(e) { return null; }
  }
  async function generateBriefing() {
    let facts = '';
    const tasks = loadTasks().filter(x => !x.done);
    if (tasks.length) {
      const today = new Date().toISOString().slice(0,10);
      const overdue = tasks.filter(x => x.dueDate && x.dueDate < today);
      facts += `${tasks.length} open task${tasks.length!==1?'s':''}`;
      if (overdue.length) {facts += ` — ${overdue.length} OVERDUE: ${overdue.map(x=>x.title).join(', ')}`;}
      facts += '\n';
    }
    const habits = loadHabits();
    const today = todayCompact();
    const atRisk = habits.filter(h => h.streak > 0 && h.lastDone !== today);
    if (atRisk.length) {facts += `Habit streaks not yet done today: ${atRisk.map(h=>`${h.name} (${h.streak}-day streak)`).join(', ')}\n`;}
    const weather = await fetchBriefingWeather();
    if (weather) {facts += `Weather in Dubai: ${weather}\n`;}

    if (!facts.trim()) {return '[EMOTION:neutral] Not much to report this morning, sir — no tasks, no habit streaks at risk. Clean slate.';}

    try {
      const r = await fetch('/api/jarvis', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ messages: [{ role:'user', text:
          `Give me my daily briefing. Here's today's raw data:\n\n${facts}\n` +
          'Synthesize this into a short, natural SPOKEN briefing — 3 to 5 sentences, like a chief of staff talking, ' +
          'not a bulleted list read aloud. Connect things that relate. Skip any category with no data above. ' +
          'Start your reply with [EMOTION:tag].' }] }),
      });
      const d = await r.json();
      return d.reply || '[EMOTION:neutral] Good morning, sir.';
    } catch(e) {
      return '[EMOTION:neutral] Good morning, sir. I gathered your data but couldn\'t put together the full briefing just now.';
    }
  }

  async function askHenry(userText) {
    if (isProtocolCreateCommand(userText)) {
      history.push({ role:'user',text:userText }); addMsg('user',userText); saveHistory();
      const reply = createProtocol(userText);
      history.push({ role:'model',text:reply }); saveHistory();
      addMsg('henry', reply); speak(reply.replace(/^\[EMOTION:\w+\]\s*/,''));
      return;
    }
    if (isProtocolListCommand(userText)) {
      history.push({ role:'user',text:userText }); addMsg('user',userText); saveHistory();
      const reply = listProtocols();
      history.push({ role:'model',text:reply }); saveHistory();
      addMsg('henry', reply); speak(reply.replace(/^\[EMOTION:\w+\]\s*/,''));
      return;
    }
    if (isProtocolDeleteCommand(userText)) {
      history.push({ role:'user',text:userText }); addMsg('user',userText); saveHistory();
      const reply = deleteProtocol(userText);
      history.push({ role:'model',text:reply }); saveHistory();
      addMsg('henry', reply); speak(reply.replace(/^\[EMOTION:\w+\]\s*/,''));
      return;
    }
    const protocolMatch = matchProtocolRun(userText);
    if (protocolMatch) {
      history.push({ role:'user',text:userText }); addMsg('user',userText); saveHistory();
      await runProtocol(protocolMatch);
      return;
    }
    if (isBriefingCommand(userText)) {
      history.push({ role:'user',text:userText }); addMsg('user',userText); saveHistory();
      addMsg('henry', 'Pulling your briefing together, sir…');
      showTyping();
      const briefing = await generateBriefing();
      removeTyping();
      const clean = briefing.replace(/^\[EMOTION:\w+\]\s*/,'');
      history.push({ role:'model',text:clean }); saveHistory();
      addMsg('henry', clean); speak(clean);
      return;
    }
    if (isTaskCommand(userText)) {
      history.push({ role:'user',text:userText }); addMsg('user',userText); saveHistory();
      const reply = handleTaskCommand(userText);
      history.push({ role:'model',text:reply }); saveHistory();
      addMsg('henry', reply); speak(reply.replace(/^\[EMOTION:\w+\]\s*/,''));
      return;
    }
    if (isHabitCommand(userText)) {
      history.push({ role:'user',text:userText }); addMsg('user',userText); saveHistory();
      const reply = handleHabitCommand(userText);
      history.push({ role:'model',text:reply }); saveHistory();
      addMsg('henry', reply); speak(reply.replace(/^\[EMOTION:\w+\]\s*/,''));
      return;
    }
    if (isDocCommand(userText)) { await tryCreateDoc(userText); return; }
    // Check for voice-triggered map / scanner
    if (checkVoiceTriggers(userText)) {
      // Still let HENRY respond in chat
    }
    const imgs  = attachments.filter(a=>a.type.startsWith('image/')).map(a=>a.dataUrl);
    const files = attachments.filter(a=>!a.type.startsWith('image/')).map(a=>a.name);
    let ctx = '';
    if (files.length) {ctx += `\n\n[Attached files: ${files.join(', ')}]`;}
    if (imgs.length)  {ctx += `\n\n[User attached ${imgs.length} image(s)]`;}
    const fullText = userText + ctx;
    history.push({ role:'user', text:fullText });
    addMsg('user', userText, null, imgs);
    clearAttachments();
    setState('thinking');
    showTyping();
    saveHistory();

    try {
      const res = await fetch('/api/jarvis', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ messages:history, imageBase64: imgs[0]||undefined }),
      });
      let data;
      try { data = await res.json(); } catch(e){ throw new Error('Server error '+res.status); }
      if (!res.ok) {throw new Error(data.error || 'API error '+res.status);}

      const reply = data.reply || 'No response.';
      history.push({ role:'model', text:reply });
      saveHistory();
      addMsg('henry', reply, data.imageUrl||null);
      speak(reply);
    } catch(err) {
      removeTyping();
      addMsg('henry', '**System error:** '+err.message);
      if (wakeEnabled) {setState('wake');} else {setState('idle');}
    }
  }

  // ── TTS ───────────────────────────────────────────────────────────────────
  window._ttsFinished = function() {
    if (appState==='speaking') { if (wakeEnabled) {setState('wake');} else {setState('idle');} }
  };

  function stripForTts(text) {
    return text
      .replace(/\[EMOTION:[^\]]+\]/g, '')
      .replace(/```[\s\S]*?```/g,'code block.')
      .replace(/`([^`]+)`/g,'$1')
      .replace(/\*\*(.*?)\*\*/g,'$1')
      .replace(/\*(.*?)\*/g,'$1')
      .replace(/#{1,6}\s/g,'')
      .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
      .replace(/^\s*[-*+]\s/gm,'')
      .replace(/^\s*\d+\.\s/gm,'')
      .trim().slice(0,800);
  }

  // Voice map — keys must match speak.js VOICE_MAP keys
  const EDGE_VOICE_MAP = {
    british:  'british_male',
    american: 'american_male',
    filipino: 'filipino_male',
    french:   'french_male',
  };

  function speak(text) {
    const plain = stripForTts(text);

    // Android native TTS bridge
    if (window.Android && typeof window.Android.speak === 'function') {
      setState('speaking');
      const trySpeak = function(attempts) {
        try {
          const ready = window.Android.isTtsReady ? window.Android.isTtsReady() : true;
          if (ready) { window.Android.speak(plain); }
          else if (attempts > 0) { setTimeout(()=>trySpeak(attempts-1), 400); }
          else { if (wakeEnabled) {setState('wake');} else {setState('idle');} }
        } catch(e) { if (wakeEnabled) {setState('wake');} else {setState('idle');} }
      };
      trySpeak(15);
      setTimeout(()=>{ if(appState==='speaking'){if(wakeEnabled){setState('wake');}else {setState('idle');}} }, Math.max(plain.length*80,4000));
      return;
    }

    // Try Edge TTS via /api/speak (same neural voice as Android)
    setState('speaking');
    (async () => {
      try {
        const voice = EDGE_VOICE_MAP[currentAccent] || 'british_male';
        const res = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: plain, voice }),
        });
        if (res.ok && res.headers.get('content-type')?.includes('audio')) {
          const blob   = await res.blob();
          const url    = URL.createObjectURL(blob);
          const audio  = new Audio(url);
          audio.onended = () => { URL.revokeObjectURL(url); if(wakeEnabled){setState('wake');}else {setState('idle');} };
          audio.onerror = () => { URL.revokeObjectURL(url); speakFallback(plain); };
          audio.play().catch(() => speakFallback(plain));
          return;
        }
      } catch(e) { /* fall through to browser TTS */ }
      speakFallback(plain);
    })();
  }

  // Browser Web Speech API fallback
  function speakFallback(plain) {
    if (!synth) { if(wakeEnabled){setState('wake');}else {setState('idle');} return; }
    synth.cancel();
    function doSpeak() {
      const voices = synth.getVoices();
      const utter  = new SpeechSynthesisUtterance(plain);
      const accentParams = {
        british: { rate:.88, pitch:.72, lang:'en-GB' },
        american:{ rate:.92, pitch:.80, lang:'en-US' },
        filipino:{ rate:.92, pitch:.85, lang:'en-PH' },
        french:  { rate:.88, pitch:.80, lang:'fr-FR' },
      };
      const p = accentParams[currentAccent] || accentParams.british;
      utter.rate=p.rate; utter.pitch=p.pitch; utter.volume=1.0; utter.lang=p.lang;
      const v = getVoiceForAccent(voices); if(v) {utter.voice=v;}
      utter.onend  = ()=>{ if(wakeEnabled){setState('wake');}else {setState('idle');} };
      utter.onerror= ()=>{ if(wakeEnabled){setState('wake');}else {setState('idle');} };
      synth.speak(utter);
    }
    const voices = synth.getVoices();
    if (!voices.length) { synth.onvoiceschanged=()=>{synth.onvoiceschanged=null;doSpeak();}; setTimeout(()=>{if(appState==='speaking'){doSpeak();}},1200); }
    else {doSpeak();}
  }

  // ── Voice input ───────────────────────────────────────────────────────────
  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { addMsg('henry','Voice input requires Chrome or Edge.'); return; }
    if (appState==='listening') { recognition&&recognition.stop(); return; }
    synth&&synth.cancel();
    if (wakeRecognition) { try{wakeRecognition.stop();}catch(e){} }
    recognition = new SR();
    const recLangs = { british:'en-GB', american:'en-US', filipino:'en-PH', french:'fr-FR' };
    recognition.lang = recLangs[currentAccent]||'en-US';
    recognition.interimResults=false; recognition.maxAlternatives=1;
    setState('listening');
    startAudioViz(); // Real mic visualization
    recognition.onresult = e => {
      stopAudioViz();
      const t = e.results[0][0].transcript.trim(); if(t) {askHenry(t);}
    };
    recognition.onerror  = ()=>{ stopAudioViz(); if(wakeEnabled){setState('wake');startWakeWord();}else {setState('idle');} };
    recognition.onend    = ()=>{ stopAudioViz(); if(appState==='listening'){if(wakeEnabled){setState('wake');startWakeWord();}else {setState('idle');}} };
    recognition.start();
  }

  function startWakeWord() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR||!wakeEnabled||(appState!=='wake'&&appState!=='idle')) {return;}
    wakeRecognition = new SR();
    wakeRecognition.lang='en-US'; wakeRecognition.continuous=false; wakeRecognition.interimResults=false;
    wakeRecognition.onresult = e => {
      const said = e.results[0][0].transcript.toLowerCase();
      if (said.includes('henry')) {startListening();}
      else {setTimeout(()=>{if(wakeEnabled&&appState==='wake'){startWakeWord();}},100);}
    };
    wakeRecognition.onerror = ()=>setTimeout(()=>{if(wakeEnabled&&(appState==='wake'||appState==='idle')){startWakeWord();}},1000);
    wakeRecognition.onend   = ()=>{if(wakeEnabled&&(appState==='wake'||appState==='idle')){setTimeout(()=>startWakeWord(),100);}};
    try{wakeRecognition.start();}catch(e){}
  }

  function toggleWake() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { addMsg('henry','Wake word requires Chrome or Edge.'); return; }
    wakeEnabled = !wakeEnabled;
    // Update all wake buttons
    ['wake-btn','d-wake-btn','m-wake-btn','r-wake-btn'].forEach(id => {
      const b = document.getElementById(id);
      if (b) { b.classList.toggle('active', wakeEnabled); b.textContent = wakeEnabled ? '⚡ WAKE: ON' : (id==='wake-btn'?'WAKE WORD':'⚡ Wake Word'); }
    });
    if (wakeEnabled) {
      setState('wake'); startWakeWord();
      addMsg('henry','Wake word activated. Say **"HENRY"** at any time, sir.');
    } else {
      if(wakeRecognition){try{wakeRecognition.stop();}catch(e){} wakeRecognition=null;}
      setState('idle');
    }
  }

  // ── Voice accent ──────────────────────────────────────────────────────────
  function updateVoiceOptionUI() {
    voiceOptions.forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.accent === pendingAccent);
    });
    const labels = { british:'VOICE', american:'VOICE·US', filipino:'VOICE·PH', french:'VOICE·FR' };
    ['voice-btn','d-voice-btn','m-voice-btn','r-voice-btn'].forEach(id => {
      const b = document.getElementById(id);
      if (b && b.id !== 'r-voice-btn') {b.textContent = labels[currentAccent]||'VOICE';}
    });
  }

  function getVoiceForAccent(voices) {
    if (currentAccent === 'american') {
      for (const fn of [
        v=>v.name==='Google US English Male', v=>v.name.toLowerCase().includes('david')&&v.lang.startsWith('en-US'),
        v=>v.name.toLowerCase().includes('mark')&&v.lang.startsWith('en-US'),
        v=>v.name.toLowerCase().includes('guy')&&v.lang.startsWith('en-US'),
        v=>v.lang==='en-US', v=>v.lang.startsWith('en'),
      ]) { const f=voices.find(fn); if(f) {return f;} }
    }
    if (currentAccent === 'filipino') {
      for (const fn of [
        v=>v.lang==='fil-PH'||v.lang==='tl-PH', v=>v.lang==='en-PH',
        v=>v.lang.startsWith('fil')||v.lang.startsWith('tl'),
        v=>v.name.toLowerCase().includes('filipino'), v=>v.lang==='en-US',
      ]) { const f=voices.find(fn); if(f) {return f;} }
    }
    if (currentAccent === 'french') {
      for (const fn of [
        v=>v.name.toLowerCase().includes('thomas')&&v.lang.startsWith('fr'),
        v=>v.name.toLowerCase().includes('nicolas')&&v.lang.startsWith('fr'),
        v=>v.lang==='fr-FR', v=>v.lang.startsWith('fr'),
      ]) { const f=voices.find(fn); if(f) {return f;} }
    }
    for (const fn of [
      v=>v.name==='Google UK English Male',
      v=>v.name.toLowerCase().includes('daniel')&&v.lang.startsWith('en-GB'),
      v=>v.lang==='en-GB', v=>v.lang.startsWith('en-GB'),
      v=>v.name.toLowerCase().includes('daniel'), v=>v.lang.startsWith('en'),
    ]) { const f=voices.find(fn); if(f) {return f;} }
    return null;
  }

  // ── Event wiring ──────────────────────────────────────────────────────────
  function openFileChooser() {
    if (window.Android && typeof window.Android.openFileChooser === 'function') {Android.openFileChooser();}
    else {fileInput.click();}
  }

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files||[]);
    for (const f of files) {await addAttachment(f);}
    fileInput.value = '';
  });

  textInput.addEventListener('input', () => {
    textInput.style.height = 'auto';
    textInput.style.height = Math.min(textInput.scrollHeight, 100) + 'px';
  });

  function doSend() {
    const text = textInput.value.trim();
    if ((!text && !attachments.length) || appState==='thinking') {return;}
    textInput.value = ''; textInput.style.height = 'auto';
    askHenry(text || 'I have attached files for you.');
  }

  // Orb click to speak
  [orbCanvas, mOrbCanvas].forEach(el => {
    el.addEventListener('click', () => {
      if (appState==='wake'||appState==='idle') {startListening();}
      else if (appState==='listening') { stopAudioViz(); recognition&&recognition.stop(); }
    });
  });

  micBtn.addEventListener('click', () => {
    if (appState==='wake'||appState==='idle') {startListening();}
    else if (appState==='listening') { stopAudioViz(); recognition&&recognition.stop(); }
  });
  sendBtn.addEventListener('click', doSend);
  textInput.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doSend();} });
  attachBtn.addEventListener('click', openFileChooser);

  // All wake buttons
  ['wake-btn','d-wake-btn','m-wake-btn'].forEach(id => {
    const b = document.getElementById(id); if(b) {b.addEventListener('click', toggleWake);}
  });
  const rWakeBtn = document.getElementById('r-wake-btn');
  if (rWakeBtn) {rWakeBtn.addEventListener('click', toggleWake);}

  // All clear buttons
  ['clear-btn','d-clear-btn','m-clear-btn','r-clear-btn'].forEach(id => {
    const b = document.getElementById(id);
    if (b) {b.addEventListener('click', ()=>{ if(confirm('Wipe all memory and start fresh?')) {clearMemory();} });}
  });

  // All voice buttons
  ['voice-btn','d-voice-btn','m-voice-btn','r-voice-btn'].forEach(id => {
    const b = document.getElementById(id);
    if (b) {b.addEventListener('click', ()=>{
      pendingAccent = currentAccent; updateVoiceOptionUI();
      voiceOverlay.classList.add('open');
    });}
  });

  // Mobile mic
  const mMicBtn = document.getElementById('m-mic-btn');
  if (mMicBtn) {mMicBtn.addEventListener('click', () => {
    if (appState==='wake'||appState==='idle') {startListening();}
    else if (appState==='listening') { stopAudioViz(); recognition&&recognition.stop(); }
  });}

  voiceOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      pendingAccent = opt.dataset.accent;
      voiceOptions.forEach(o => o.classList.toggle('selected', o.dataset.accent===pendingAccent));
    });
  });
  voiceCancelBtn.addEventListener('click', ()=>voiceOverlay.classList.remove('open'));
  voiceOverlay.addEventListener('click', e=>{ if(e.target===voiceOverlay) {voiceOverlay.classList.remove('open');} });
  voiceApplyBtn.addEventListener('click', ()=>{
    currentAccent = pendingAccent;
    localStorage.setItem('henry_accent', currentAccent);
    updateVoiceOptionUI();
    voiceOverlay.classList.remove('open');
    const names = { british:'British', american:'American', filipino:'Filipino', french:'French' };
    addMsg('henry', '[EMOTION:warm]\nVoice accent set to ' + names[currentAccent] + ', sir.');
    speak('Voice accent set to ' + names[currentAccent] + ', sir.');
  });

  // PWA install
  window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; installBanner.classList.add('show'); });
  installBtn.addEventListener('click', async ()=>{ if(!deferredPrompt){return;} deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; installBanner.classList.remove('show'); });
  installDismiss.addEventListener('click', ()=>installBanner.classList.remove('show'));
  window.addEventListener('appinstalled', ()=>{ installBanner.classList.remove('show'); deferredPrompt=null; });
  if ('serviceWorker' in navigator) {navigator.serviceWorker.register('/public/sw.js').catch(()=>{});}

  if (synth) { synth.getVoices(); synth.onvoiceschanged=()=>synth.getVoices(); }
  updateVoiceOptionUI();

  // ── Init ──────────────────────────────────────────────────────────────────
  loadHistory();
  setState('idle');

  if (history.length > 0) {
    const note = document.createElement('div');
    note.style.cssText='text-align:center;font-size:1.5rem;color:var(--tdim);letter-spacing:.18em;padding:.5rem 0;';
    note.textContent='— MEMORY RESTORED · '+history.length+' MESSAGES —';
    const firstRow = chatInner.querySelector('.msg-row');
    if (firstRow) {chatInner.insertBefore(note, firstRow);}
  }

  // ── Space Button ──────────────────────────────────────────────────────────
  const spaceBtn = document.getElementById('space-btn');
  if (spaceBtn) {spaceBtn.addEventListener('click', () => window.openSpacePanel?.());}

  // ── Markets Button ────────────────────────────────────────────────────────
  const marketsBtn = document.getElementById('markets-btn');
  if (marketsBtn) {marketsBtn.addEventListener('click', () => window.openMarketsPanel?.());}

  // ── Radar Button ──────────────────────────────────────────────────────────
  const radarBtn = document.getElementById('radar-btn');
  if (radarBtn) {radarBtn.addEventListener('click', () => window.openRadarPanel?.());}

  // ── Theme Button ──────────────────────────────────────────────────────────
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {themeBtn.addEventListener('click', () => {
    const o = document.getElementById('theme-overlay');
    o.style.display = o.style.display === 'flex' ? 'none' : 'flex';
  });}
  document.getElementById('theme-close')?.addEventListener('click', () => {
    document.getElementById('theme-overlay').style.display = 'none';
  });
  document.querySelectorAll('.theme-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.theme;
      document.body.className = document.body.className.replace(/theme-\w+/g,'').trim();
      if (t !== 'ocean') {document.body.classList.add('theme-'+t);}
      document.querySelectorAll('.theme-choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      localStorage.setItem('henry_theme', t);
    });
  });
  // Restore theme
  const savedTheme = localStorage.getItem('henry_theme');
  if (savedTheme && savedTheme !== 'ocean') {
    document.body.classList.add('theme-'+savedTheme);
    document.querySelector(`.theme-choice[data-theme="${savedTheme}"]`)?.classList.add('active');
  }

  // ── Flight Tracker Button ─────────────────────────────────────────────────
  const flightBtn = document.getElementById('flight-btn');
  if (flightBtn) {flightBtn.addEventListener('click', () => window.openFlightTracker?.());}

  // ── Globe Map Button ──────────────────────────────────────────────────────
  const globeBtn = document.getElementById('globe-btn');
  if (globeBtn) {globeBtn.addEventListener('click', () => window.openGlobeMap?.());}

  // ── Animal Scanner Button ─────────────────────────────────────────────────
  const animalBtn = document.getElementById('animal-btn');
  if (animalBtn) {animalBtn.addEventListener('click', () => window.openAnimalScanner?.());}

  // ── Plant Scanner Button ──────────────────────────────────────────────────
  const plantBtn = document.getElementById('plant-btn');
  if (plantBtn) {plantBtn.addEventListener('click', () => window.openPlantScanner?.());}

  // ── Brain Button ──────────────────────────────────────────────────────────
  const brainBtnEl = document.getElementById('brain-btn');
  if (brainBtnEl) {brainBtnEl.addEventListener('click', () => window.openBrain?.());}

})();
