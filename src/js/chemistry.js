(async () => {  const overlay   = document.getElementById('flight-overlay');
  const closeBtn  = document.getElementById('flight-close-btn');
  const searchBtn = document.getElementById('flight-search-btn');
  const input     = document.getElementById('flight-input');
  const resultDiv = document.getElementById('flight-result');
  const progress  = document.getElementById('flight-progress');
  const progFill  = document.getElementById('flight-progress-fill');

  function openFlightTracker(flightNum) {
    overlay.style.display = 'flex';
    resultDiv.innerHTML   = '';
    progress.style.display = 'none';
    if (flightNum) { input.value = flightNum; doSearch(); }
    else {input.focus();}
  }
  window.openFlightTracker = openFlightTracker;

  if (closeBtn)  {closeBtn.addEventListener('click', () => { overlay.style.display = 'none'; });}
  if (overlay)   {overlay.addEventListener('click', e => { if (e.target === overlay) {overlay.style.display = 'none';} });}
  if (searchBtn) {searchBtn.addEventListener('click', doSearch);}
  if (input)     {input.addEventListener('keydown', e => { if (e.key === 'Enter') {doSearch();} });}

  // Example chips
  document.querySelectorAll('.flight-example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.textContent.trim();
      doSearch();
    });
  });

  function showProgress(on) {
    progress.style.display = on ? 'block' : 'none';
    if (on) {
      let w = 0;
      progFill.style.width = '0%';
      const iv = setInterval(() => {
        w = Math.min(w + 3, 88);
        progFill.style.width = w + '%';
        if (w >= 88) {clearInterval(iv);}
      }, 200);
    } else {
      progFill.style.width = '100%';
      setTimeout(() => { progress.style.display = 'none'; }, 400);
    }
  }

  async function doSearch() {
    const raw = (input.value || '').trim().toUpperCase().replace(/\s+/g,'');
    if (!raw) { resultDiv.innerHTML = '<div style="color:#c0392b;font-size:.95rem;">Please enter a flight number.</div>'; return; }
    resultDiv.innerHTML = '';
    showProgress(true);
    searchBtn.disabled = true;

    let found = false;

    // ── 1) OpenSky live data ──────────────────────────────────────
    try {
      const r = await Promise.race([
        fetch('https://opensky-network.org/api/states/all'),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ]);
      if (r.ok) {
        const json   = await r.json();
        const states = json.states || [];
        const match  = states.find(s => {
          const cs = ((s[1]||'').trim().toUpperCase()).replace(/\s+/g,'');
          return cs.includes(raw) || raw.startsWith(cs.slice(0,3));
        });
        if (match) {
          found = true;
          const callsign = ((match[1]||'').trim()) || raw;
          const country  = match[2] || 'Unknown';
          const lon      = parseFloat(match[5]||0);
          const lat      = parseFloat(match[6]||0);
          const alt      = parseFloat(match[7]||0);
          const speed    = parseFloat(match[9]||0);
          const heading  = parseFloat(match[10]||0);
          const onGround = match[8] === true || match[8] === 'true';
          const altFt    = Math.round(alt * 3.281);
          const spdKmh   = Math.round(speed * 3.6);
          const statusClr = onGround ? '#ffc107' : '#00d4ff';
          const statusTxt = onGround ? '🟡 ON GROUND' : '✈ AIRBORNE';

          showProgress(false);
          resultDiv.innerHTML = `
            <div class="flight-card">
              <div class="flight-card-title">${callsign} &nbsp;<span class="flight-live-tag">● LIVE</span></div>
              <div style="color:${statusClr};font-size:1.05rem;font-weight:700;margin-bottom:.8rem;">${statusTxt}</div>
              <div class="flight-card-row">
                <div class="flight-card-col">
                  <div class="flight-card-label">COUNTRY OF ORIGIN</div>
                  <div class="flight-card-val">🌍 ${country}</div>
                </div>
                <div class="flight-card-col">
                  <div class="flight-card-label">HEADING</div>
                  <div class="flight-card-val">${Math.round(heading)}°</div>
                </div>
              </div>
              <div class="flight-card-row">
                <div class="flight-card-col">
                  <div class="flight-card-label">ALTITUDE</div>
                  <div class="flight-card-val">${Math.round(alt).toLocaleString()} m &nbsp;(${altFt.toLocaleString()} ft)</div>
                </div>
                <div class="flight-card-col">
                  <div class="flight-card-label">SPEED</div>
                  <div class="flight-card-val">${spdKmh} km/h</div>
                </div>
              </div>
              <div style="margin-bottom:.6rem;">
                <div class="flight-card-label">POSITION</div>
                <div class="flight-card-val">${lat.toFixed(4)}°N &nbsp;${lon.toFixed(4)}°E</div>
              </div>
              <a href="https://www.flightradar24.com/?lat=${lat}&lon=${lon}&zoom=7" target="_blank"
                style="display:block;background:var(--c);color:#020c1b;text-align:center;padding:.6rem;
                       text-decoration:none;font-size:.9rem;letter-spacing:.1em;font-weight:700;margin-top:.8rem;">
                OPEN ON FLIGHTRADAR24 →
              </a>
            </div>
            <div style="color:#005577;font-size:.75rem;letter-spacing:.1em;">Source: OpenSky Network (real-time ADS-B)</div>
          `;
        }
      }
    } catch(e) {}

    // ── 2) Fallback: HENRY AI ─────────────────────────────────────
    if (!found) {
      try {
        const r = await fetch('/api/jarvis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role:'user', text:`Tell me about flight ${raw}: airline, route, schedule, aircraft type, on-time record, and tips. Format clearly.` }],
            queryType: 'flight',
            responseMode: 'balanced',
          }),
        });
        const data  = await r.json();
        const   reply = (data.reply || 'No data available.').replace(/\[EMOTION:[a-z]+\]\s*/gi,'').trim();
        showProgress(false);
        const html = typeof marked !== 'undefined' ? marked.parse(reply) : reply.replace(/\n/g,'<br>');
        resultDiv.innerHTML = `
          <div class="flight-card">
            <div class="flight-card-title">H·E·N·R·Y INTEL — ${raw}</div>
            <div style="color:var(--text);font-size:.97rem;line-height:1.65;">${html}</div>
            <a href="https://www.flightradar24.com/" target="_blank"
              style="display:block;background:rgba(0,212,255,.12);border:1px solid rgba(0,212,255,.3);
                     color:var(--c);text-align:center;padding:.55rem;text-decoration:none;
                     font-size:.88rem;letter-spacing:.1em;margin-top:.8rem;">
              LIVE TRACKING ON FLIGHTRADAR24 →
            </a>
          </div>
        `;
      } catch(e) {
        showProgress(false);
        resultDiv.innerHTML = '<div style="color:#c0392b;">Could not retrieve data. Check <a href="https://www.flightradar24.com" target="_blank" style="color:var(--c);">FlightRadar24</a>.</div>';
      }
    }

    searchBtn.disabled = false;
  }

  // ── Wire voice command detection ────────────────────────────────
  window._origSendFlightHook = window.sendMessage;
  document.addEventListener('henry-voice-cmd', e => {
    const txt = (e.detail || '').toLowerCase();
    const m   = txt.match(/(?:track|check|status of|find)\s+(?:flight\s+)?([a-z]{2}\d{1,4})/i);
    if (m) { openFlightTracker(m[1].toUpperCase()); }
    else if (txt.includes('flight tracker') || txt.includes('open flight')) {
      openFlightTracker();
    }
  });

})();
