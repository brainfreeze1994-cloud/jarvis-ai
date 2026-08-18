// ── Helpers ──────────────────────────────────────────────────────────────────
async function safeFetch(url, opts={}, timeout=8000) {
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), timeout);
    const r    = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(tid);
    return r;
  } catch(e) { return null; }
}

function fmtChg(chg) {
  const n = parseFloat(chg||0);
  return `<span class="${n>=0?'mkt-up':'mkt-dn'}">${n>=0?'+':''}${n.toFixed(2)}%</span>`;
}

// ── ISS live position (right panel) ─────────────────────────────────────────
async function refreshISS() {
  // wheretheiss.at is more reliable than open-notify.org
  const r = await safeFetch('https://api.wheretheiss.at/v1/satellites/25544', {}, 6000);
  if (!r) return;
  const d = await r.json().catch(()=>null);
  if (!d?.latitude) return;
  const lat = parseFloat(d.latitude).toFixed(2);
  const lon = parseFloat(d.longitude).toFixed(2);
  const alt = d.altitude ? Math.round(d.altitude) + ' km' : '~408 km';
  const el  = document.getElementById('r-iss-pos');
  const sub = document.getElementById('r-iss-sub');
  if (el)  el.textContent  = `${lat}°N  ${lon}°E`;
  if (sub) sub.textContent = `Alt: ${alt} · Live`;
}

// ── Last major earthquake (right panel) ─────────────────────────────────────
async function refreshQuake() {
  const r = await safeFetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson');
  if (!r) return;
  const d = await r.json().catch(()=>null);
  const f = d?.features?.[0];
  if (!f) return;
  const mag   = f.properties.mag?.toFixed(1);
  const place = f.properties.place || 'Unknown';
  const magEl = document.getElementById('r-quake-mag');
  const plEl  = document.getElementById('r-quake-place');
  if (magEl) { magEl.textContent = 'M' + mag; magEl.style.color = parseFloat(mag)>=6?'#ff4444':parseFloat(mag)>=5?'#ffc107':'#00d4ff'; }
  if (plEl)  plEl.textContent = place;
}

// ── Crypto pulse (right panel) ───────────────────────────────────────────────
async function refreshCrypto() {
  const r = await safeFetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
  if (!r) return;
  const d = await r.json().catch(()=>null);
  if (!d) return;
  const el = document.getElementById('r-crypto-lines');
  if (!el) return;
  const lines = [
    ['bitcoin','BTC'],['ethereum','ETH'],['solana','SOL']
  ].filter(([id])=>d[id]).map(([id,sym])=>{
    const p   = d[id].usd;
    const chg = d[id].usd_24h_change?.toFixed(2)||'0';
    const n   = parseFloat(chg);
    const clr = n>=0?'#00c853':'#c62828';
    return `${sym} $${p>=1?p.toFixed(2):p.toFixed(4)} <span style="color:${clr}">${n>=0?'+':''}${chg}%</span>`;
  });
  el.innerHTML = lines.join('<br>');
}

// ── Start live panel refresh loop ────────────────────────────────────────────
function startLivePanel() {
  refreshISS();   setInterval(refreshISS,   30000);
  refreshQuake(); setInterval(refreshQuake, 120000);
  refreshCrypto(); setInterval(refreshCrypto, 60000);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startLivePanel);
else startLivePanel();

// ══════════════════════════════════════════════════════════════════════════════
// 🚀 SPACE COMMAND PANEL
// ══════════════════════════════════════════════════════════════════════════════
window.openSpacePanel = async function() {
  const ov  = document.getElementById('space-overlay');
  const con = document.getElementById('space-content');
  ov.style.display = 'flex';
  // Show placeholder cards immediately so UI feels instant
  con.innerHTML = `
    <div class="flight-card" id="sp-iss" style="margin-bottom:.8rem;">
      <div class="flight-card-title">🛸 ISS LIVE POSITION <span class="flight-live-tag">● LIVE</span></div>
      <div style="color:var(--tdim);font-size:.9rem;">Locating space station…</div>
    </div>
    <div class="flight-card" id="sp-apod" style="margin-bottom:.8rem;">
      <div class="flight-card-title">🔭 NASA PHOTO OF THE DAY</div>
      <div style="color:var(--tdim);font-size:.9rem;">Fetching today's image…</div>
    </div>
    <div class="flight-card" id="sp-neo">
      <div class="flight-card-title">☄️ NEAR-EARTH ASTEROIDS</div>
      <div style="color:var(--tdim);font-size:.9rem;">Scanning near-Earth space…</div>
    </div>
    <div class="flight-card" id="sp-facts" style="margin-top:.8rem;">
      <div class="flight-card-title">⚡ HENRY SPACE INTEL</div>
      <div style="color:var(--tdim);font-size:.88rem;line-height:1.8;">
        The observable universe is 93 billion light-years in diameter.<br>
        There are more stars in the universe than grains of sand on Earth.<br>
        Light from the Sun takes 8 minutes 20 seconds to reach us.<br>
        The Milky Way has 200–400 billion stars.
      </div>
    </div>`;
  ov.addEventListener('click', e => { if(e.target===ov) ov.style.display='none'; }, {once:true});

  // Run all fetches in PARALLEL (not sequential)
  const [issResult, apodResult, neoResult] = await Promise.allSettled([
    // ISS — wheretheiss.at is reliable, open-notify is often down
    (async () => {
      const r = await safeFetch('https://api.wheretheiss.at/v1/satellites/25544', {}, 6000);
      return r ? r.json() : null;
    })(),
    // APOD — use open NASA API (no key needed for this endpoint)
    (async () => {
      const r = await safeFetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', {}, 8000);
      if (!r || !r.ok) return null;
      return r.json();
    })(),
    // Asteroids
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const r = await safeFetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=DEMO_KEY`, {}, 8000);
      if (!r || !r.ok) return null;
      return r.json();
    })(),
  ]);

  // ── ISS ──
  const issEl = document.getElementById('sp-iss');
  if (issEl) {
    const d = issResult.value;
    if (d?.latitude) {
      const lat = parseFloat(d.latitude).toFixed(3);
      const lon = parseFloat(d.longitude).toFixed(3);
      const alt = d.altitude ? Math.round(d.altitude) : 408;
      const spd = d.velocity ? Math.round(d.velocity) : 27600;
      issEl.innerHTML = `
        <div class="flight-card-title">🛸 ISS LIVE POSITION <span class="flight-live-tag">● LIVE</span></div>
        <div style="font-size:1.4rem;font-family:monospace;color:var(--c);margin:.5rem 0;">${lat}°N &nbsp; ${lon}°E</div>
        <div style="color:var(--tdim);font-size:.9rem;line-height:1.8;">
          Altitude: ${alt} km &nbsp;·&nbsp; Speed: ${spd.toLocaleString()} km/h &nbsp;·&nbsp; Orbit: every 92 min
        </div>
        <a href="https://spotthestation.nasa.gov" target="_blank" style="display:block;margin-top:.8rem;background:var(--c);color:#020c1b;text-align:center;padding:.55rem;text-decoration:none;font-size:.88rem;font-weight:700;letter-spacing:.1em;">SPOT THE STATION — NASA →</a>`;
    } else {
      issEl.innerHTML = `
        <div class="flight-card-title">🛸 ISS LIVE POSITION</div>
        <div style="color:var(--tdim);font-size:.9rem;line-height:1.8;">
          ISS data currently unavailable via API.<br>
          Altitude: ~408 km &nbsp;·&nbsp; Speed: ~27,600 km/h
        </div>
        <a href="https://isstracker.pl/en" target="_blank" style="display:block;margin-top:.8rem;background:rgba(0,212,255,.12);border:1px solid var(--bdr);color:var(--c);text-align:center;padding:.55rem;text-decoration:none;font-size:.88rem;letter-spacing:.1em;">TRACK ISS LIVE →</a>`;
    }
  }

  // ── APOD ──
  const apodEl = document.getElementById('sp-apod');
  if (apodEl) {
    const d = apodResult.value;
    if (d?.title) {
      const expl = (d.explanation||'').slice(0,320);
      apodEl.innerHTML = `
        <div class="flight-card-title">🔭 NASA PHOTO OF THE DAY</div>
        <div style="color:#c8e8f8;font-size:1rem;font-weight:700;margin:.5rem 0;">${d.title}</div>
        ${d.url && d.media_type==='image' ? `<img src="${d.url}" style="width:100%;max-height:220px;object-fit:cover;margin:.5rem 0;border:1px solid var(--bdr);" loading="lazy" onerror="this.style.display='none'"/>` : ''}
        <div style="color:var(--tdim);font-size:.88rem;line-height:1.65;">${expl}…</div>`;
    } else {
      // Fallback: show a curated space fact instead
      apodEl.innerHTML = `
        <div class="flight-card-title">🔭 SPACE FACT</div>
        <div style="color:#c8e8f8;font-size:.95rem;line-height:1.8;">
          The James Webb Space Telescope can see galaxies formed just 300 million years after the Big Bang —
          13.5 billion years ago. It operates 1.5 million km from Earth at the L2 Lagrange point.
        </div>
        <a href="https://webbtelescope.org/news/first-images" target="_blank" style="display:block;margin-top:.8rem;background:rgba(0,212,255,.12);border:1px solid var(--bdr);color:var(--c);text-align:center;padding:.55rem;text-decoration:none;font-size:.88rem;letter-spacing:.1em;">WEBB TELESCOPE IMAGES →</a>`;
    }
  }

  // ── NEO / Asteroids ──
  const neoEl = document.getElementById('sp-neo');
  if (neoEl) {
    const d = neoResult.value;
    if (d?.element_count !== undefined) {
      const neos   = Object.values(d.near_earth_objects||{})[0] || [];
      const haz    = neos.filter(n=>n.is_potentially_hazardous_asteroid).length;
      const sorted = neos.sort((a,b)=>parseFloat(a.close_approach_data?.[0]?.miss_distance?.kilometers||Infinity)-parseFloat(b.close_approach_data?.[0]?.miss_distance?.kilometers||Infinity));
      const closest = sorted[0];
      const dist    = closest ? parseInt(closest.close_approach_data?.[0]?.miss_distance?.kilometers||0).toLocaleString() : 'N/A';
      neoEl.innerHTML = `
        <div class="flight-card-title">☄️ NEAR-EARTH ASTEROIDS TODAY</div>
        <div style="display:flex;gap:1.5rem;margin:.7rem 0;">
          <div><div style="color:#005577;font-size:.72rem;letter-spacing:.12em;">TRACKED</div><div style="color:var(--c);font-size:1.4rem;font-weight:700;">${d.element_count}</div></div>
          <div><div style="color:#005577;font-size:.72rem;letter-spacing:.12em;">HAZARDOUS</div><div style="color:${haz>0?'#ff4444':'#00c853'};font-size:1.4rem;font-weight:700;">${haz}</div></div>
        </div>
        <div style="color:var(--tdim);font-size:.88rem;">Closest: <span style="color:#c8e8f8;">${closest?.name||'N/A'}</span> at ${dist} km</div>
        <div style="color:#3a7aa0;font-size:.78rem;margin-top:.5rem;">NASA monitors all near-Earth objects 24/7. Earth is safe.</div>`;
    } else {
      neoEl.innerHTML = `
        <div class="flight-card-title">☄️ NEAR-EARTH OBJECTS</div>
        <div style="color:var(--tdim);font-size:.9rem;line-height:1.8;">
          NASA tracks 2,300+ potentially hazardous asteroids. None pose a threat in the next 100 years.<br>
          The Planetary Defense Coordination Office monitors all near-Earth objects 24/7.
        </div>
        <a href="https://cneos.jpl.nasa.gov/ca/" target="_blank" style="display:block;margin-top:.8rem;background:rgba(0,212,255,.12);border:1px solid var(--bdr);color:var(--c);text-align:center;padding:.55rem;text-decoration:none;font-size:.88rem;letter-spacing:.1em;">NASA CLOSE APPROACHES →</a>`;
    }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 📈 LIVE MARKETS PANEL
// ══════════════════════════════════════════════════════════════════════════════
window.openMarketsPanel = async function() {
  const ov  = document.getElementById('markets-overlay');
  const con = document.getElementById('markets-content');
  ov.style.display = 'flex';
  ov.addEventListener('click', e => { if(e.target===ov) ov.style.display='none'; }, {once:true});
  document.getElementById('markets-refresh')?.addEventListener('click', loadMarkets);
  loadMarkets();

  async function loadMarkets() {
    con.innerHTML = '<div style="color:var(--tdim);text-align:center;padding:1.5rem;">Fetching live prices…</div>';
    let html = '<div style="font-size:.78rem;color:#005577;letter-spacing:.12em;margin-bottom:.6rem;">STOCKS · LIVE · USD</div>';

    const stocks = [['AAPL','Apple'],['TSLA','Tesla'],['NVDA','NVIDIA'],['GOOGL','Alphabet'],['MSFT','Microsoft'],['AMZN','Amazon'],['META','Meta'],['AMD','AMD']];
    for (const [sym, name] of stocks) {
      try {
        const r = await safeFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`);
        const d = r ? await r.json() : null;
        const meta = d?.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) continue;
        const price = meta.regularMarketPrice;
        const prev  = meta.previousClose || meta.chartPreviousClose || price;
        const chg   = ((price-prev)/prev*100);
        const up    = chg >= 0;
        html += `<div class="mkt-row">
          <div><div class="mkt-ticker">${sym}</div><div class="mkt-name">${name}</div></div>
          <div style="text-align:right"><div class="mkt-price">$${price.toFixed(2)}</div><div class="mkt-chg ${up?'mkt-up':'mkt-dn'}">${up?'+':''}${chg.toFixed(2)}%</div></div>
        </div>`;
      } catch(e) {}
    }

    html += '<div style="font-size:.78rem;color:#005577;letter-spacing:.12em;margin:1rem 0 .6rem;">CRYPTO · LIVE</div>';
    try {
      const ids = 'bitcoin,ethereum,binancecoin,solana,ripple,dogecoin,cardano';
      const r   = await safeFetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      const d   = r ? await r.json() : null;
      if (d) {
        const map = {bitcoin:'BTC',ethereum:'ETH',binancecoin:'BNB',solana:'SOL',ripple:'XRP',dogecoin:'DOGE',cardano:'ADA'};
        for (const [id, sym] of Object.entries(map)) {
          if (!d[id]) continue;
          const price = d[id].usd;
          const chg   = d[id].usd_24h_change||0;
          const up    = chg >= 0;
          const ps    = price >= 1 ? `$${price.toFixed(2)}` : `$${price.toFixed(5)}`;
          html += `<div class="mkt-row">
            <div><div class="mkt-ticker">${sym}</div><div class="mkt-name">Crypto</div></div>
            <div style="text-align:right"><div class="mkt-price">${ps}</div><div class="mkt-chg ${up?'mkt-up':'mkt-dn'}">${up?'+':''}${chg.toFixed(2)}%</div></div>
          </div>`;
        }
      }
    } catch(e) {}

    html += '<div style="color:#003344;font-size:.75rem;margin-top:.8rem;">Source: Yahoo Finance · CoinGecko</div>';
    con.innerHTML = html;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 🌐 EARTH RADAR PANEL
// ══════════════════════════════════════════════════════════════════════════════
window.openRadarPanel = async function() {
  const ov  = document.getElementById('radar-overlay');
  const con = document.getElementById('radar-content');
  ov.style.display = 'flex';
  con.innerHTML = '<div style="color:var(--tdim);text-align:center;padding:1.5rem;">Loading earth data…</div>';
  ov.addEventListener('click', e => { if(e.target===ov) ov.style.display='none'; }, {once:true});

  let html = '';

  // Earthquakes
  try {
    const r = await safeFetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson');
    const d = r ? await r.json() : null;
    const feats = d?.features || [];
    html += `<div style="color:var(--c);font-size:.95rem;font-weight:700;letter-spacing:.1em;margin-bottom:.8rem;">🌍 ${feats.length} Significant Earthquakes This Week</div>`;
    feats.slice(0,10).forEach(f => {
      const mag   = f.properties.mag?.toFixed(1);
      const place = f.properties.place || 'Unknown';
      const t     = new Date(f.properties.time).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      const m     = parseFloat(mag);
      const clr   = m>=7?'#ff4444':m>=6?'#ff8800':m>=5?'#ffc107':'#00d4ff';
      html += `<div class="quake-row">
        <div class="quake-mag" style="color:${clr}">M${mag}</div>
        <div><div class="quake-place">${place}</div><div class="quake-time">${t}${m>=6?' &nbsp;⚠ MAJOR':''}</div></div>
      </div>`;
    });
    html += `<a href="https://earthquake.usgs.gov/earthquakes/map/" target="_blank" style="display:block;margin-top:.8rem;background:var(--c);color:#020c1b;text-align:center;padding:.55rem;text-decoration:none;font-size:.88rem;font-weight:700;letter-spacing:.1em;">OPEN USGS LIVE MAP →</a>`;
  } catch(e) {}

  // Global weather snapshot
  html += `<div style="color:#005577;font-size:.78rem;letter-spacing:.14em;margin:1.2rem 0 .6rem;">🌡 GLOBAL WEATHER SNAPSHOT</div>`;
  const cities = ['Dubai','London','New+York','Tokyo','Sydney','Paris'];
  for (const city of cities) {
    try {
      const r = await safeFetch(`https://wttr.in/${city}?format=%C+%t+%h+💧`);
      const t = r ? await r.text() : null;
      if (t) {
        html += `<div style="display:flex;gap:.8rem;padding:.4rem 0;border-bottom:1px solid #081830;font-size:.9rem;">
          <span style="color:var(--c);min-width:90px;font-family:monospace;">${city.replace('+',' ')}</span>
          <span style="color:#c8e8f8;">${t.trim()}</span>
        </div>`;
      }
    } catch(e) {}
  }

  con.innerHTML = html || '<div style="color:var(--tdim);">Earth data temporarily unavailable.</div>';
};

// ── Storm Tracker (tropical storms / typhoons / hurricanes worldwide) ──────

// ── Periodic Table / Element Mixer ──────────────────────────────────────────
const PERIODIC_ELEMENTS = [
{s:'H',n:'Hydrogen',num:1,c:'#69DB7C',r:1,col:1,econfig:'1s1',summary:'Hydrogen is a chemical element with chemical symbol H and atomic number 1. With an atomic weight of 1.00794 u, hydrogen is the lightest element on the periodic table.',image:'https://upload.wikimedia.org/wikipedia/commons/d/d9/Hydrogenglow.jpg',uses:'Rocket fuel, ammonia production, hydrogenating fats'},
{s:'He',n:'Helium',num:2,c:'#845EF7',r:1,col:18,econfig:'1s2',summary:'Helium is a chemical element with symbol He and atomic number 2. It is a colorless, odorless, tasteless, non-toxic, inert, monatomic gas that heads the noble gas group in the periodic table. Its boiling and melting points are the lowest among all the elements.',image:'https://upload.wikimedia.org/wikipedia/commons/0/00/Helium-glow.jpg',uses:'Balloons, MRI magnet cooling, deep-sea diving gas mixes'},
{s:'Li',n:'Lithium',num:3,c:'#FF6B6B',r:2,col:1,econfig:'[He] 2s1',summary:'Lithium (from Greek:λίθος lithos, \\"stone\\") is a chemical element with the symbol Li and atomic number 3. It is a soft, silver-white metal belonging to the alkali metal group of chemical elements.',image:'https://upload.wikimedia.org/wikipedia/commons/e/e2/0.5_grams_lithium_under_argon.jpg',uses:'Rechargeable batteries, mood-stabilizing medication'},
{s:'Be',n:'Beryllium',num:4,c:'#FFA94D',r:2,col:2,econfig:'[He] 2s2',summary:'Beryllium is a chemical element with symbol Be and atomic number 4. It is created through stellar nucleosynthesis and is a relatively rare element in the universe. It is a divalent element which occurs naturally only in combination with other elements in minerals.',image:'https://upload.wikimedia.org/wikipedia/commons/e/e2/Beryllium_%28Be%29.jpg',uses:''},
{s:'B',n:'Boron',num:5,c:'#FFD43B',r:2,col:13,econfig:'[He] 2s2 2p1',summary:'Boron is a metalloid chemical element with symbol B and atomic number 5. Produced entirely by cosmic ray spallation and supernovae and not by stellar nucleosynthesis, it is a low-abundance element in both the Solar system and the Earth\'s crust.',image:'https://upload.wikimedia.org/wikipedia/commons/a/a2/Boron.jpg',uses:''},
{s:'C',n:'Carbon',num:6,c:'#69DB7C',r:2,col:14,econfig:'[He] 2s2 2p2',summary:'Carbon (from Latin:carbo \\"coal\\") is a chemical element with symbol C and atomic number 6. On the periodic table, it is the first (row 2) of six elements in column (group) 14, which have in common the composition of their outer electron shell.',image:'https://upload.wikimedia.org/wikipedia/commons/6/68/Pure_Carbon.png',uses:'Steel-making, pencils (graphite), diamonds, all organic life'},
{s:'N',n:'Nitrogen',num:7,c:'#69DB7C',r:2,col:15,econfig:'[He] 2s2 2p3',summary:'Nitrogen is a chemical element with symbol N and atomic number 7. It is the lightest pnictogen and at room temperature, it is a transparent, odorless diatomic gas.',image:'https://upload.wikimedia.org/wikipedia/commons/2/2d/Nitrogen-glow.jpg',uses:'Fertilizer, food packaging (inert atmosphere), liquid nitrogen freezing'},
{s:'O',n:'Oxygen',num:8,c:'#69DB7C',r:2,col:16,econfig:'[He] 2s2 2p4',summary:'Oxygen is a chemical element with symbol O and atomic number 8. It is a member of the chalcogen group on the periodic table and is a highly reactive nonmetal and oxidizing agent that readily forms compounds (notably oxides) with most elements.',image:'https://upload.wikimedia.org/wikipedia/commons/a/a0/Liquid_oxygen_in_a_beaker_%28cropped_and_retouched%29.jpg',uses:'Breathing, welding, steel production, medical oxygen'},
{s:'F',n:'Fluorine',num:9,c:'#FF922B',r:2,col:17,econfig:'[He] 2s2 2p5',summary:'Fluorine is a chemical element with symbol F and atomic number 9. It is the lightest halogen and exists as a highly toxic pale yellow diatomic gas at standard conditions.',image:'https://upload.wikimedia.org/wikipedia/commons/2/2c/Fluoro_liquido_a_-196%C2%B0C_1.jpg',uses:'Toothpaste (fluoride), Teflon, refrigerants'},
{s:'Ne',n:'Neon',num:10,c:'#845EF7',r:2,col:18,econfig:'[He] 2s2 2p6',summary:'Neon is a chemical element with symbol Ne and atomic number 10. It is in group 18 (noble gases) of the periodic table. Neon is a colorless, odorless, inert monatomic gas under standard conditions, with about two-thirds the density of air.',image:'https://upload.wikimedia.org/wikipedia/commons/f/f8/Neon-glow.jpg',uses:'Neon signs, high-voltage indicators'},
{s:'Na',n:'Sodium',num:11,c:'#FF6B6B',r:3,col:1,econfig:'[Ne] 3s1',summary:'Sodium /ˈsoʊdiəm/ is a chemical element with symbol Na (from Ancient Greek Νάτριο) and atomic number 11. It is a soft, silver-white, highly reactive metal.',image:'https://upload.wikimedia.org/wikipedia/commons/2/27/Na_%28Sodium%29.jpg',uses:'Table salt, streetlights, soap-making'},
{s:'Mg',n:'Magnesium',num:12,c:'#FFA94D',r:3,col:2,econfig:'[Ne] 3s2',summary:'Magnesium is a chemical element with symbol Mg and atomic number 12. It is a shiny gray solid which bears a close physical resemblance to the other five elements in the second column (Group 2, or alkaline earth metals) of the periodic table:they each have the same electron...',image:'https://upload.wikimedia.org/wikipedia/commons/3/3f/Magnesium_crystals.jpg',uses:'Fireworks, lightweight alloys, dietary supplements'},
{s:'Al',n:'Aluminium',num:13,c:'#9775FA',r:3,col:13,econfig:'[Ne] 3s2 3p1',summary:'Aluminium (or aluminum; see different endings) is a chemical element in the boron group with symbol Al and atomic number 13. It is a silvery-white, soft, nonmagnetic, ductile metal.',image:'https://upload.wikimedia.org/wikipedia/commons/3/3e/Aluminium.jpg',uses:'Cans, foil, aircraft parts, window frames'},
{s:'Si',n:'Silicon',num:14,c:'#FFD43B',r:3,col:14,econfig:'[Ne] 3s2 3p2',summary:'Silicon is a chemical element with symbol Si and atomic number 14. It is a tetravalent metalloid, more reactive than germanium, the metalloid directly below it in the table. Controversy about silicon\'s character dates to its discovery.',image:'https://upload.wikimedia.org/wikipedia/commons/2/2c/Silicon.jpg',uses:'Computer chips, glass, solar panels'},
{s:'P',n:'Phosphorus',num:15,c:'#69DB7C',r:3,col:15,econfig:'[Ne] 3s2 3p3',summary:'Phosphorus is a chemical element with symbol P and atomic number 15. As an element, phosphorus exists in two major forms—white phosphorus and red phosphorus—but due to its high reactivity, phosphorus is never found as a free element on Earth.',image:'https://upload.wikimedia.org/wikipedia/commons/6/6d/Phosphorus-purple.jpg',uses:'Fertilizer, matches, DNA/bone structure'},
{s:'S',n:'Sulfur',num:16,c:'#69DB7C',r:3,col:16,econfig:'[Ne] 3s2 3p4',summary:'Sulfur or sulphur (see spelling differences) is a chemical element with symbol S and atomic number 16. It is an abundant, multivalent non-metal. Under normal conditions, sulfur atoms form cyclic octatomic molecules with chemical formula S8.',image:'https://upload.wikimedia.org/wikipedia/commons/2/23/Native_sulfur_%28Vodinskoe_Deposit%3B_quarry_near_Samara%2C_Russia%29_9.jpg',uses:'Sulfuric acid, rubber vulcanization, gunpowder'},
{s:'Cl',n:'Chlorine',num:17,c:'#FF922B',r:3,col:17,econfig:'[Ne] 3s2 3p5',summary:'Chlorine is a chemical element with symbol Cl and atomic number 17. It also has a relative atomic mass of 35.5. Chlorine is in the halogen group (17) and is the second lightest halogen following fluorine.',image:'https://upload.wikimedia.org/wikipedia/commons/9/9a/Chlorine-sample-flip.jpg',uses:'Water disinfection, PVC plastic, bleach'},
{s:'Ar',n:'Argon',num:18,c:'#845EF7',r:3,col:18,econfig:'[Ne] 3s2 3p6',summary:'Argon is a chemical element with symbol Ar and atomic number 18. It is in group 18 of the periodic table and is a noble gas.',image:'https://upload.wikimedia.org/wikipedia/commons/5/53/Argon-glow.jpg',uses:'Inert shielding gas for welding, incandescent bulb filling'},
{s:'K',n:'Potassium',num:19,c:'#FF6B6B',r:4,col:1,econfig:'[Ar] 4s1',summary:'Potassium is a chemical element with symbol K (derived from Neo-Latin, kalium) and atomic number 19. It was first isolated from potash, the ashes of plants, from which its name is derived.',image:'https://upload.wikimedia.org/wikipedia/commons/b/b3/Potassium.JPG',uses:'Fertilizer, banana ripening, muscle/nerve function'},
{s:'Ca',n:'Calcium',num:20,c:'#FFA94D',r:4,col:2,econfig:'[Ar] 4s2',summary:'Calcium is a chemical element with symbol Ca and atomic number 20. Calcium is a soft gray alkaline earth metal, fifth-most-abundant element by mass in the Earth\'s crust.',image:'https://upload.wikimedia.org/wikipedia/commons/7/72/Calcium.jpg',uses:'Bones and teeth, cement, chalk'},
{s:'Sc',n:'Scandium',num:21,c:'#4DABF7',r:4,col:3,econfig:'[Ar] 3d1 4s2',summary:'Scandium is a chemical element with symbol Sc and atomic number 21. A silvery-white metallic d-block element, it has historically been sometimes classified as a rare earth element, together with yttrium and the lanthanoids.',image:'https://upload.wikimedia.org/wikipedia/commons/f/f5/Scandium%2C_Sc.jpg',uses:'Aerospace alloys, stadium lighting'},
{s:'Ti',n:'Titanium',num:22,c:'#4DABF7',r:4,col:4,econfig:'[Ar] 3d2 4s2',summary:'Titanium is a chemical element with symbol Ti and atomic number 22. It is a lustrous transition metal with a silver color, low density and high strength. It is highly resistant to corrosion in sea water, aqua regia and chlorine.',image:'https://upload.wikimedia.org/wikipedia/commons/e/ec/Titanium.jpg',uses:'Aircraft frames, hip replacements, white paint pigment'},
{s:'V',n:'Vanadium',num:23,c:'#4DABF7',r:4,col:5,econfig:'[Ar] 3d3 4s2',summary:'Vanadium is a chemical element with symbol V and atomic number 23. It is a hard, silvery grey, ductile and malleable transition metal.',image:'https://upload.wikimedia.org/wikipedia/commons/0/0a/Vanadium-pieces.jpg',uses:'Steel alloys (strength), catalysts'},
{s:'Cr',n:'Chromium',num:24,c:'#4DABF7',r:4,col:6,econfig:'[Ar] 3d5 4s1',summary:'Chromium is a chemical element with symbol Cr and atomic number 24. It is the first element in Group 6. It is a steely-gray, lustrous, hard and brittle metal which takes a high polish, resists tarnishing, and has a high melting point.',image:'https://upload.wikimedia.org/wikipedia/commons/a/a1/Chromium.jpg',uses:'Stainless steel, chrome plating'},
{s:'Mn',n:'Manganese',num:25,c:'#4DABF7',r:4,col:7,econfig:'[Ar] 3d5 4s2',summary:'Manganese is a chemical element with symbol Mn and atomic number 25. It is not found as a free element in nature; it is often found in combination with iron, and in many minerals. Manganese is a metal with important industrial metal alloy uses, particularly in stainless steels.',image:'https://upload.wikimedia.org/wikipedia/commons/6/64/Manganese_element.jpg',uses:'Steel-making, batteries'},
{s:'Fe',n:'Iron',num:26,c:'#4DABF7',r:4,col:8,econfig:'[Ar] 3d6 4s2',summary:'Iron is a chemical element with symbol Fe (from Latin:ferrum) and atomic number 26. It is a metal in the first transition series. It is by mass the most common element on Earth, forming much of Earth\'s outer and inner core.',image:'https://images-of-elements.com/iron-2.jpg',uses:'Steel, construction, hemoglobin in blood'},
{s:'Co',n:'Cobalt',num:27,c:'#4DABF7',r:4,col:9,econfig:'[Ar] 3d7 4s2',summary:'Cobalt is a chemical element with symbol Co and atomic number 27. Like nickel, cobalt in the Earth\'s crust is found only in chemically combined form, save for small deposits found in alloys of natural meteoric iron.',image:'https://upload.wikimedia.org/wikipedia/commons/6/62/Cobalt_ore_2.jpg',uses:'Rechargeable battery cathodes, blue pigment, magnets'},
{s:'Ni',n:'Nickel',num:28,c:'#4DABF7',r:4,col:10,econfig:'[Ar] 3d8 4s2',summary:'Nickel is a chemical element with symbol Ni and atomic number 28. It is a silvery-white lustrous metal with a slight golden tinge. Nickel belongs to the transition metals and is hard and ductile.',image:'https://upload.wikimedia.org/wikipedia/commons/5/57/Nickel_chunk.jpg',uses:'Stainless steel, coins, rechargeable batteries'},
{s:'Cu',n:'Copper',num:29,c:'#4DABF7',r:4,col:11,econfig:'[Ar] 3d10 4s1',summary:'Copper is a chemical element with symbol Cu (from Latin:cuprum) and atomic number 29. It is a soft, malleable and ductile metal with very high thermal and electrical conductivity. A freshly exposed surface of pure copper has a reddish-orange color.',image:'https://upload.wikimedia.org/wikipedia/commons/f/f0/NatCopper.jpg',uses:'Electrical wiring, plumbing, coins'},
{s:'Zn',n:'Zinc',num:30,c:'#4DABF7',r:4,col:12,econfig:'[Ar] 3d10 4s2',summary:'Zinc, in commerce also spelter, is a chemical element with symbol Zn and atomic number 30. It is the first element of group 12 of the periodic table. In some respects zinc is chemically similar to magnesium:its ion is of similar size and its only common oxidation state is +2.',image:'https://upload.wikimedia.org/wikipedia/commons/b/ba/Zinc_%2830_Zn%29.jpg',uses:'Galvanizing steel, batteries, sunscreen'},
{s:'Ga',n:'Gallium',num:31,c:'#9775FA',r:4,col:13,econfig:'[Ar] 3d10 4s2 4p1',summary:'Gallium is a chemical element with symbol Ga and atomic number 31. Elemental gallium does not occur in free form in nature, but as the gallium(III) compounds that are in trace amounts in zinc ores and in bauxite.',image:'https://upload.wikimedia.org/wikipedia/commons/b/b1/Solid_gallium_%28Ga%29.jpg',uses:'LEDs, semiconductors'},
{s:'Ge',n:'Germanium',num:32,c:'#FFD43B',r:4,col:14,econfig:'[Ar] 3d10 4s2 4p2',summary:'Germanium is a chemical element with symbol Ge and atomic number 32. It is a lustrous, hard, grayish-white metalloid in the carbon group, chemically similar to its group neighbors tin and silicon.',image:'https://upload.wikimedia.org/wikipedia/commons/0/08/Polycrystalline-germanium.jpg',uses:'Fiber optics, infrared optics, semiconductors'},
{s:'As',n:'Arsenic',num:33,c:'#FFD43B',r:4,col:15,econfig:'[Ar] 3d10 4s2 4p3',summary:'Arsenic is a chemical element with symbol As and atomic number 33. Arsenic occurs in many minerals, usually in conjunction with sulfur and metals, and also as a pure elemental crystal. Arsenic is a metalloid.',image:'https://upload.wikimedia.org/wikipedia/commons/3/3b/Arsenic_%2833_As%29.jpg',uses:'Semiconductors (historically also pesticides — now restricted)'},
{s:'Se',n:'Selenium',num:34,c:'#69DB7C',r:4,col:16,econfig:'[Ar] 3d10 4s2 4p4',summary:'Selenium is a chemical element with symbol Se and atomic number 34. It is a nonmetal with properties that are intermediate between those of its periodic table column-adjacent chalcogen elements sulfur and tellurium.',image:'https://upload.wikimedia.org/wikipedia/commons/7/7f/Selenium.jpg',uses:'Photocopiers, glassmaking, dietary supplement'},
{s:'Br',n:'Bromine',num:35,c:'#FF922B',r:4,col:17,econfig:'[Ar] 3d10 4s2 4p5',summary:'Bromine (from Ancient Greek:βρῶμος, brómos, meaning \\"stench\\") is a chemical element with symbol Br, and atomic number 35. It is a halogen. The element was isolated independently by two chemists, Carl Jacob Löwig and Antoine Jerome Balard, in 1825–1826.',image:'https://upload.wikimedia.org/wikipedia/commons/8/87/Bromine-ampoule.jpg',uses:'Flame retardants, photography chemicals'},
{s:'Kr',n:'Krypton',num:36,c:'#845EF7',r:4,col:18,econfig:'[Ar] 3d10 4s2 4p6',summary:'Krypton (from Greek:κρυπτός kryptos \\"the hidden one\\") is a chemical element with symbol Kr and atomic number 36. It is a member of group 18 (noble gases) elements.',image:'https://upload.wikimedia.org/wikipedia/commons/9/9c/Krypton-glow.jpg',uses:'Camera flash bulbs, fluorescent lighting'},
{s:'Rb',n:'Rubidium',num:37,c:'#FF6B6B',r:5,col:1,econfig:'[Kr] 5s1',summary:'Rubidium is a chemical element with symbol Rb and atomic number 37. Rubidium is a soft, silvery-white metallic element of the alkali metal group, with an atomic mass of 85.4678.',image:'https://upload.wikimedia.org/wikipedia/commons/c/c9/Rb5.JPG',uses:'Atomic clocks, research'},
{s:'Sr',n:'Strontium',num:38,c:'#FFA94D',r:5,col:2,econfig:'[Kr] 5s2',summary:'Strontium is a chemical element with symbol Sr and atomic number 38. An alkaline earth metal, strontium is a soft silver-white or yellowish metallic element that is highly reactive chemically. The metal turns yellow when it is exposed to air.',image:'https://upload.wikimedia.org/wikipedia/commons/8/84/Strontium-1.jpg',uses:'Red fireworks, fluorescent lighting'},
{s:'Y',n:'Yttrium',num:39,c:'#4DABF7',r:5,col:3,econfig:'[Kr] 4d1 5s2',summary:'Yttrium is a chemical element with symbol Y and atomic number 39. It is a silvery-metallic transition metal chemically similar to the lanthanides and it has often been classified as a \\"rare earth element\\".',image:'https://upload.wikimedia.org/wikipedia/commons/9/90/Piece_of_Yttrium.jpg',uses:'LED phosphors, camera lenses'},
{s:'Zr',n:'Zirconium',num:40,c:'#4DABF7',r:5,col:4,econfig:'[Kr] 4d2 5s2',summary:'Zirconium is a chemical element with symbol Zr and atomic number 40. The name of zirconium is taken from the name of the mineral zircon, the most important source of zirconium. The word zircon comes from the Persian word zargun زرگون, meaning \\"gold-colored\\".',image:'https://upload.wikimedia.org/wikipedia/commons/1/1d/Zirconium-pieces.jpg',uses:'Nuclear reactor cladding, ceramics, jewelry (cubic zirconia)'},
{s:'Nb',n:'Niobium',num:41,c:'#4DABF7',r:5,col:5,econfig:'[Kr] 4d4 5s1',summary:'Niobium, formerly columbium, is a chemical element with symbol Nb (formerly Cb) and atomic number 41. It is a soft, grey, ductile transition metal, which is often found in the pyrochlore mineral, the main commercial source for niobium, and columbite.',image:'https://upload.wikimedia.org/wikipedia/commons/c/c2/Niobium_strips.JPG',uses:'MRI magnet wiring (superconductors), steel alloys'},
{s:'Mo',n:'Molybdenum',num:42,c:'#4DABF7',r:5,col:6,econfig:'[Kr] 4d5 5s1',summary:'Molybdenum is a chemical element with symbol Mo and atomic number 42. The name is from Neo-Latin molybdaenum, from Ancient Greek Μόλυβδος molybdos, meaning lead, since its ores were confused with lead ores.',image:'https://upload.wikimedia.org/wikipedia/commons/f/f0/Molybdenum.jpg',uses:'High-strength steel alloys, electrodes'},
{s:'Tc',n:'Technetium',num:43,c:'#4DABF7',r:5,col:7,econfig:'[Kr] 4d5 5s2',summary:'Technetium (/tɛkˈniːʃiəm/) is a chemical element with symbol Tc and atomic number 43. It is the element with the lowest atomic number in the periodic table that has no stable isotopes:every form of it is radioactive.',image:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Technetium-sample-cropped.jpg',uses:'Medical imaging (radioactive tracer)'},
{s:'Ru',n:'Ruthenium',num:44,c:'#4DABF7',r:5,col:8,econfig:'[Kr] 4d7 5s1',summary:'Ruthenium is a chemical element with symbol Ru and atomic number 44. It is a rare transition metal belonging to the platinum group of the periodic table. Like the other metals of the platinum group, ruthenium is inert to most other chemicals.',image:'https://upload.wikimedia.org/wikipedia/commons/a/a8/Ruthenium_crystal.jpg',uses:'Electrical contacts, jewelry alloys'},
{s:'Rh',n:'Rhodium',num:45,c:'#4DABF7',r:5,col:9,econfig:'[Kr] 4d8 5s1',summary:'Rhodium is a chemical element with symbol Rh and atomic number 45. It is a rare, silvery-white, hard, and chemically inert transition metal. It is a member of the platinum group.',image:'https://upload.wikimedia.org/wikipedia/commons/5/54/Rhodium_%28Rh%29.jpg',uses:'Catalytic converters, jewelry plating'},
{s:'Pd',n:'Palladium',num:46,c:'#4DABF7',r:5,col:10,econfig:'[Kr] 4d10',summary:'Palladium is a chemical element with symbol Pd and atomic number 46. It is a rare and lustrous silvery-white metal discovered in 1803 by William Hyde Wollaston.',image:'https://upload.wikimedia.org/wikipedia/commons/d/d7/Palladium_%2846_Pd%29.jpg',uses:'Catalytic converters, jewelry, electronics'},
{s:'Ag',n:'Silver',num:47,c:'#4DABF7',r:5,col:11,econfig:'[Kr] 4d10 5s1',summary:'Silver is a chemical element with symbol Ag (Greek:άργυρος árguros, Latin:argentum, both from the Indo-European root *h₂erǵ- for \\"grey\\" or \\"shining\\") and atomic number 47.',image:'https://upload.wikimedia.org/wikipedia/commons/e/e4/Silver-nugget.jpg',uses:'Jewelry, silverware, electrical contacts, mirrors'},
{s:'Cd',n:'Cadmium',num:48,c:'#4DABF7',r:5,col:12,econfig:'[Kr] 4d10 5s2',summary:'Cadmium is a chemical element with symbol Cd and atomic number 48. This soft, bluish-white metal is chemically similar to the two other stable metals in group 12, zinc and mercury.',image:'https://images-of-elements.com/cadmium-4.jpg',uses:'Rechargeable batteries, pigments'},
{s:'In',n:'Indium',num:49,c:'#9775FA',r:5,col:13,econfig:'[Kr] 4d10 5s2 5p1',summary:'Indium is a chemical element with symbol In and atomic number 49. It is a post-transition metallic element that is rare in Earth\'s crust. The metal is very soft, malleable and easily fusible, with a melting point higher than sodium, but lower than lithium or tin.',image:'https://images-of-elements.com/indium-2.jpg',uses:'Touchscreens, LCD displays'},
{s:'Sn',n:'Tin',num:50,c:'#9775FA',r:5,col:14,econfig:'[Kr] 4d10 5s2 5p2',summary:'Tin is a chemical element with the symbol Sn (for Latin:stannum) and atomic number 50. It is a main group metal in group 14 of the periodic table.',image:'https://upload.wikimedia.org/wikipedia/commons/6/6a/Tin-2.jpg',uses:'Tin cans, solder, bronze alloy'},
{s:'Sb',n:'Antimony',num:51,c:'#FFD43B',r:5,col:15,econfig:'[Kr] 4d10 5s2 5p3',summary:'Antimony is a chemical element with symbol Sb (from Latin:stibium) and atomic number 51. A lustrous gray metalloid, it is found in nature mainly as the sulfide mineral stibnite (Sb2S3).',image:'https://upload.wikimedia.org/wikipedia/commons/5/5c/Antimony-4.jpg',uses:'Flame retardants, batteries'},
{s:'Te',n:'Tellurium',num:52,c:'#FFD43B',r:5,col:16,econfig:'[Kr] 4d10 5s2 5p4',summary:'Tellurium is a chemical element with symbol Te and atomic number 52. It is a brittle, mildly toxic, rare, silver-white metalloid. Tellurium is chemically related to selenium and sulfur.',image:'https://upload.wikimedia.org/wikipedia/commons/c/c1/Tellurium2.jpg',uses:'Solar panels, alloys'},
{s:'I',n:'Iodine',num:53,c:'#FF922B',r:5,col:17,econfig:'[Kr] 4d10 5s2 5p5',summary:'Iodine is a chemical element with symbol I and atomic number 53. The name is from Greek ἰοειδής ioeidēs, meaning violet or purple, due to the color of iodine vapor.',image:'https://upload.wikimedia.org/wikipedia/commons/c/c2/Iodine-sample.jpg',uses:'Antiseptics, iodized salt, X-ray contrast dye'},
{s:'Xe',n:'Xenon',num:54,c:'#845EF7',r:5,col:18,econfig:'[Kr] 4d10 5s2 5p6',summary:'Xenon is a chemical element with symbol Xe and atomic number 54. It is a colorless, dense, odorless noble gas, that occurs in the Earth\'s atmosphere in trace amounts.',image:'https://upload.wikimedia.org/wikipedia/commons/5/5d/Xenon-glow.jpg',uses:'Car headlights (xenon lamps), anesthesia research'},
{s:'Cs',n:'Cesium',num:55,c:'#FF6B6B',r:6,col:1,econfig:'[Xe] 6s1',summary:'Caesium or cesium is a chemical element with symbol Cs and atomic number 55. It is a soft, silvery-gold alkali metal with a melting point of 28 °C (82 °F), which makes it one of only five elemental metals that are liquid at or near room temperature.',image:'https://upload.wikimedia.org/wikipedia/commons/3/3d/Cesium.jpg',uses:'Atomic clocks (defines the second)'},
{s:'Ba',n:'Barium',num:56,c:'#FFA94D',r:6,col:2,econfig:'[Xe] 6s2',summary:'Barium is a chemical element with symbol Ba and atomic number 56. It is the fifth element in Group 2, a soft silvery metallic alkaline earth metal. Because of its high chemical reactivity barium is never found in nature as a free element.',image:'https://upload.wikimedia.org/wikipedia/commons/f/f5/Barium_%2856_Ba%29.jpg',uses:'X-ray/CT contrast drink ("barium meal"), fireworks'},
{s:'La',n:'Lanthanum',num:57,c:'#63E6BE',r:6,col:3,econfig:'[Xe] 5d16s2',summary:'Lanthanum is a soft, ductile, silvery-white metallic chemical element with symbol La and atomic number 57. It tarnishes rapidly when exposed to air and is soft enough to be cut with a knife.',image:'https://upload.wikimedia.org/wikipedia/commons/f/f7/Lanthanum.jpg',uses:'Camera lenses, hybrid car batteries'},
{s:'Ce',n:'Cerium',num:58,c:'#63E6BE',r:9,col:4,econfig:'[Xe] 4f1 5d1 6s2',summary:'Cerium is a chemical element with symbol Ce and atomic number 58. It is a soft, silvery, ductile metal which easily oxidizes in air. Cerium was named after the dwarf planet Ceres (itself named after the Roman goddess of agriculture).',image:'https://upload.wikimedia.org/wikipedia/commons/0/0d/Cerium2.jpg',uses:''},
{s:'Pr',n:'Praseodymium',num:59,c:'#63E6BE',r:9,col:5,econfig:'[Xe] 4f3 6s2',summary:'Praseodymium is a chemical element with symbol Pr and atomic number 59. Praseodymium is a soft, silvery, malleable and ductile metal in the lanthanide group. It is valued for its magnetic, electrical, chemical, and optical properties.',image:'https://upload.wikimedia.org/wikipedia/commons/c/c7/Praseodymium.jpg',uses:''},
{s:'Nd',n:'Neodymium',num:60,c:'#63E6BE',r:9,col:6,econfig:'[Xe] 4f4 6s2',summary:'Neodymium is a chemical element with symbol Nd and atomic number 60. It is a soft silvery metal that tarnishes in air. Neodymium was discovered in 1885 by the Austrian chemist Carl Auer von Welsbach.',image:'https://upload.wikimedia.org/wikipedia/commons/c/c9/Neodymium_%2860_Nd%29.jpg',uses:''},
{s:'Pm',n:'Promethium',num:61,c:'#63E6BE',r:9,col:7,econfig:'[Xe] 4f5 6s2',summary:'Promethium, originally prometheum, is a chemical element with the symbol Pm and atomic number 61. All of its isotopes are radioactive; it is one of only two such elements that are followed in the periodic table by elements with stable forms, a distinction shared with technetium.',image:'https://upload.wikimedia.org/wikipedia/commons/5/5b/Promethium.jpg',uses:''},
{s:'Sm',n:'Samarium',num:62,c:'#63E6BE',r:9,col:8,econfig:'[Xe] 4f6 6s2',summary:'Samarium is a chemical element with symbol Sm and atomic number 62. It is a moderately hard silvery metal that readily oxidizes in air. Being a typical member of the lanthanide series, samarium usually assumes the oxidation state +3.',image:'https://upload.wikimedia.org/wikipedia/commons/8/88/Samarium-2.jpg',uses:''},
{s:'Eu',n:'Europium',num:63,c:'#63E6BE',r:9,col:9,econfig:'[Xe] 4f7 6s2',summary:'Europium is a chemical element with symbol Eu and atomic number 63. It was isolated in 1901 and is named after the continent of Europe. It is a moderately hard, silvery metal which readily oxidizes in air and water.',image:'https://upload.wikimedia.org/wikipedia/commons/6/6a/Europium.jpg',uses:''},
{s:'Gd',n:'Gadolinium',num:64,c:'#63E6BE',r:9,col:10,econfig:'[Xe] 4f7 5d1 6s2',summary:'Gadolinium is a chemical element with symbol Gd and atomic number 64. It is a silvery-white, malleable and ductile rare-earth metal. It is found in nature only in combined (salt) form.',image:'https://upload.wikimedia.org/wikipedia/commons/c/c2/Gadolinium-2.jpg',uses:''},
{s:'Tb',n:'Terbium',num:65,c:'#63E6BE',r:9,col:11,econfig:'[Xe] 4f9 6s2',summary:'Terbium is a chemical element with symbol Tb and atomic number 65. It is a silvery-white rare earth metal that is malleable, ductile and soft enough to be cut with a knife.',image:'https://upload.wikimedia.org/wikipedia/commons/9/9a/Terbium-2.jpg',uses:''},
{s:'Dy',n:'Dysprosium',num:66,c:'#63E6BE',r:9,col:12,econfig:'[Xe] 4f10 6s2',summary:'Dysprosium is a chemical element with the symbol Dy and atomic number 66. It is a rare earth element with a metallic silver luster. Dysprosium is never found in nature as a free element, though it is found in various minerals, such as xenotime.',image:'https://upload.wikimedia.org/wikipedia/commons/5/55/Dysprosium-2.jpg',uses:''},
{s:'Ho',n:'Holmium',num:67,c:'#63E6BE',r:9,col:13,econfig:'[Xe] 4f11 6s2',summary:'Holmium is a chemical element with symbol Ho and atomic number 67. Part of the lanthanide series, holmium is a rare earth element. Holmium was discovered by Swedish chemist Per Theodor Cleve.',image:'https://upload.wikimedia.org/wikipedia/commons/0/0a/Holmium2.jpg',uses:''},
{s:'Er',n:'Erbium',num:68,c:'#63E6BE',r:9,col:14,econfig:'[Xe] 4f12 6s2',summary:'Erbium is a chemical element in the lanthanide series, with symbol Er and atomic number 68. A silvery-white solid metal when artificially isolated, natural erbium is always found in chemical combination with other elements on Earth.',image:'https://upload.wikimedia.org/wikipedia/commons/2/2a/Erbium-2.jpg',uses:''},
{s:'Tm',n:'Thulium',num:69,c:'#63E6BE',r:9,col:15,econfig:'[Xe] 4f13 6s2',summary:'Thulium is a chemical element with symbol Tm and atomic number 69. It is the thirteenth and antepenultimate (third-last) element in the lanthanide series. Like the other lanthanides, the most common oxidation state is +3, seen in its oxide, halides and other compounds.',image:'https://upload.wikimedia.org/wikipedia/commons/6/6b/Thulium-2.jpg',uses:''},
{s:'Yb',n:'Ytterbium',num:70,c:'#63E6BE',r:9,col:16,econfig:'[Xe] 4f14 6s2',summary:'Ytterbium is a chemical element with symbol Yb and atomic number 70. It is the fourteenth and penultimate element in the lanthanide series, which is the basis of the relative stability of its +2 oxidation state.',image:'https://upload.wikimedia.org/wikipedia/commons/c/ce/Ytterbium-3.jpg',uses:''},
{s:'Lu',n:'Lutetium',num:71,c:'#63E6BE',r:9,col:17,econfig:'[Xe] 4f14 5d1 6s2',summary:'Lutetium is a chemical element with symbol Lu and atomic number 71. It is a silvery white metal, which resists corrosion in dry, but not in moist air.',image:'https://upload.wikimedia.org/wikipedia/commons/e/e8/Lutetium.jpg',uses:''},
{s:'Hf',n:'Hafnium',num:72,c:'#4DABF7',r:6,col:4,econfig:'[Xe] 4f14 5d2 6s2',summary:'Hafnium is a chemical element with symbol Hf and atomic number 72. A lustrous, silvery gray, tetravalent transition metal, hafnium chemically resembles zirconium and is found in zirconium minerals.',image:'https://upload.wikimedia.org/wikipedia/commons/1/17/Hafnium_%2872_Hf%29.jpg',uses:''},
{s:'Ta',n:'Tantalum',num:73,c:'#4DABF7',r:6,col:5,econfig:'[Xe] 4f14 5d3 6s2',summary:'Tantalum is a chemical element with symbol Ta and atomic number 73. Previously known as tantalium, its name comes from Tantalus, an antihero from Greek mythology. Tantalum is a rare, hard, blue-gray, lustrous transition metal that is highly corrosion-resistant.',image:'https://upload.wikimedia.org/wikipedia/commons/6/61/Tantalum.jpg',uses:''},
{s:'W',n:'Tungsten',num:74,c:'#4DABF7',r:6,col:6,econfig:'[Xe] 4f14 5d4 6s2',summary:'Tungsten, also known as wolfram, is a chemical element with symbol W and atomic number 74. The word tungsten comes from the Swedish language tung sten, which directly translates to heavy stone.',image:'https://upload.wikimedia.org/wikipedia/commons/c/c8/Tungsten_rod_with_oxidised_surface.jpg',uses:'Light bulb filaments, drill bits, jewelry'},
{s:'Re',n:'Rhenium',num:75,c:'#4DABF7',r:6,col:7,econfig:'[Xe] 4f14 5d5 6s2',summary:'Rhenium is a chemical element with symbol Re and atomic number 75. It is a silvery-white, heavy, third-row transition metal in group 7 of the periodic table.',image:'https://upload.wikimedia.org/wikipedia/commons/d/d9/Pure_rhenium_bead%2C_arc_melted%2C_21_grams._Original_size_in_cm_-_1.5_x_1.7.jpg',uses:''},
{s:'Os',n:'Osmium',num:76,c:'#4DABF7',r:6,col:8,econfig:'[Xe] 4f14 5d6 6s2',summary:'Osmium (from Greek osme (ὀσμή) meaning \\"smell\\") is a chemical element with symbol Os and atomic number 76. It is a hard, brittle, bluish-white transition metal in the platinum group that is found as a trace element in alloys, mostly in platinum ores.',image:'https://upload.wikimedia.org/wikipedia/commons/3/3c/Osmium-bead.jpg',uses:''},
{s:'Ir',n:'Iridium',num:77,c:'#4DABF7',r:6,col:9,econfig:'[Xe] 4f14 5d7 6s2',summary:'Iridium is a chemical element with symbol Ir and atomic number 77. A very hard, brittle, silvery-white transition metal of the platinum group, iridium is generally credited with being the second densest element (after osmium) based on measured density, although calculations...',image:'https://upload.wikimedia.org/wikipedia/commons/a/a8/Iridium-2.jpg',uses:''},
{s:'Pt',n:'Platinum',num:78,c:'#4DABF7',r:6,col:10,econfig:'[Xe] 4f14 5d9 6s1',summary:'Platinum is a chemical element with symbol Pt and atomic number 78. It is a dense, malleable, ductile, highly unreactive, precious, gray-white transition metal. Its name is derived from the Spanish term platina, which is literally translated into \\"little silver\\".',image:'https://upload.wikimedia.org/wikipedia/commons/6/68/Platinum_crystals.jpg',uses:'Catalytic converters, jewelry, cancer drugs'},
{s:'Au',n:'Gold',num:79,c:'#4DABF7',r:6,col:11,econfig:'[Xe] 4f14 5d10 6s1',summary:'Gold is a chemical element with symbol Au (from Latin:aurum) and atomic number 79. In its purest form, it is a bright, slightly reddish yellow, dense, soft, malleable and ductile metal. Chemically, gold is a transition metal and a group 11 element.',image:'https://upload.wikimedia.org/wikipedia/commons/8/8a/Gold_%2879_Au%29.jpg',uses:'Jewelry, electronics, currency reserves'},
{s:'Hg',n:'Mercury',num:80,c:'#4DABF7',r:6,col:12,econfig:'[Xe] 4f14 5d10 6s2',summary:'Mercury is a chemical element with symbol Hg and atomic number 80. It is commonly known as quicksilver and was formerly named hydrargyrum (/haɪˈdrɑːrdʒərəm/).',image:'https://upload.wikimedia.org/wikipedia/commons/b/be/Hydrargyrum_%2880_Hg%29.jpg',uses:'Old thermometers, fluorescent lighting (largely phased out)'},
{s:'Tl',n:'Thallium',num:81,c:'#9775FA',r:6,col:13,econfig:'[Xe] 4f14 5d10 6s2 6p1',summary:'Thallium is a chemical element with symbol Tl and atomic number 81. This soft gray post-transition metal is not found free in nature. When isolated, it resembles tin, but discolors when exposed to air.',image:'https://upload.wikimedia.org/wikipedia/commons/5/55/Thallium_%2881_Tl%29.jpg',uses:'Historically rat poison (now restricted); electronics'},
{s:'Pb',n:'Lead',num:82,c:'#9775FA',r:6,col:14,econfig:'[Xe] 4f14 5d10 6s2 6p2',summary:'Lead (/lɛd/) is a chemical element in the carbon group with symbol Pb (from Latin:plumbum) and atomic number 82. Lead is a soft, malleable and heavy post-transition metal.',image:'https://upload.wikimedia.org/wikipedia/commons/6/63/Lead-2.jpg',uses:'Car batteries, radiation shielding, historically pipes/paint'},
{s:'Bi',n:'Bismuth',num:83,c:'#9775FA',r:6,col:15,econfig:'[Xe] 4f14 5d10 6s2 6p3',summary:'Bismuth is a chemical element with symbol Bi and atomic number 83. Bismuth, a pentavalent post-transition metal, chemically resembles arsenic and antimony. Elemental bismuth may occur naturally, although its sulfide and oxide form important commercial ores.',image:'https://upload.wikimedia.org/wikipedia/commons/a/a5/Bismuth-2.jpg',uses:'Stomach medicine (Pepto-Bismol), fire sprinklers, cosmetics'},
{s:'Po',n:'Polonium',num:84,c:'#FFD43B',r:6,col:16,econfig:'[Xe] 4f14 5d10 6s2 6p4',summary:'Polonium is a chemical element with symbol Po and atomic number 84, discovered in 1898 by Marie Curie and Pierre Curie. A rare and highly radioactive element with no stable isotopes, polonium is chemically similar to bismuth and tellurium, and it occurs in uranium ores.',image:'https://images-of-elements.com/polonium.jpg',uses:''},
{s:'At',n:'Astatine',num:85,c:'#FF922B',r:6,col:17,econfig:'[Xe] 4f14 5d10 6s2 6p5',summary:'Astatine is a very rare radioactive chemical element with the chemical symbol At and atomic number 85. It occurs on Earth as the decay product of various heavier elements. All its isotopes are short-lived; the most stable is astatine-210, with a half-life of 8.1 hours.',image:'https://images-of-elements.com/astatine.jpg',uses:''},
{s:'Rn',n:'Radon',num:86,c:'#845EF7',r:6,col:18,econfig:'[Xe] 4f14 5d10 6s2 6p6',summary:'Radon is a chemical element with symbol Rn and atomic number 86. It is a radioactive, colorless, odorless, tasteless noble gas, occurring naturally as a decay product of radium. Its most stable isotope, 222Rn, has a half-life of 3.8 days.',image:'https://images-of-elements.com/radon.jpg',uses:''},
{s:'Fr',n:'Francium',num:87,c:'#FF6B6B',r:7,col:1,econfig:'[Rn] 7s1',summary:'Francium is a chemical element with symbol Fr and atomic number 87. It used to be known as eka-caesium and actinium K. It is the second-least electronegative element, behind only caesium. Francium is a highly radioactive metal that decays into astatine, radium, and radon.',image:'https://images-of-elements.com/francium.jpg',uses:''},
{s:'Ra',n:'Radium',num:88,c:'#FFA94D',r:7,col:2,econfig:'[Rn] 7s2',summary:'Radium is a chemical element with symbol Ra and atomic number 88. It is the sixth element in group 2 of the periodic table, also known as the alkaline earth metals.',image:'https://upload.wikimedia.org/wikipedia/commons/b/bb/Radium226.jpg',uses:''},
{s:'Ac',n:'Actinium',num:89,c:'#38D9A9',r:7,col:3,econfig:'[Rn] 6d1 7s2',summary:'Actinium is a radioactive chemical element with symbol Ac (not to be confused with the abbreviation for an acetyl group) and atomic number 89, which was discovered in 1899. It was the first non-primordial radioactive element to be isolated.',image:'https://upload.wikimedia.org/wikipedia/commons/2/27/Actinium_sample_%2831481701837%29.png',uses:''},
{s:'Th',n:'Thorium',num:90,c:'#38D9A9',r:10,col:4,econfig:'[Rn] 6d2 7s2',summary:'Thorium is a chemical element with symbol Th and atomic number 90. A radioactive actinide metal, thorium is one of only two significantly radioactive elements that still occur naturally in large quantities as a primordial element (the other being uranium).',image:'https://upload.wikimedia.org/wikipedia/commons/f/f7/Thorium-1.jpg',uses:''},
{s:'Pa',n:'Protactinium',num:91,c:'#38D9A9',r:10,col:5,econfig:'[Rn] 5f2 6d1 7s2',summary:'Protactinium is a chemical element with symbol Pa and atomic number 91. It is a dense, silvery-gray metal which readily reacts with oxygen, water vapor and inorganic acids.',image:'https://upload.wikimedia.org/wikipedia/commons/a/af/Protactinium-233.jpg',uses:''},
{s:'U',n:'Uranium',num:92,c:'#38D9A9',r:10,col:6,econfig:'[Rn] 5f3 6d1 7s2',summary:'Uranium is a chemical element with symbol U and atomic number 92. It is a silvery-white metal in the actinide series of the periodic table. A uranium atom has 92 protons and 92 electrons, of which 6 are valence electrons.',image:'https://upload.wikimedia.org/wikipedia/commons/b/b2/Ames_Process_uranium_biscuit.jpg',uses:'Nuclear power/fuel, historically glass coloring'},
{s:'Np',n:'Neptunium',num:93,c:'#38D9A9',r:10,col:7,econfig:'[Rn] 5f4 6d1 7s2',summary:'Neptunium is a chemical element with symbol Np and atomic number 93. A radioactive actinide metal, neptunium is the first transuranic element.',image:'https://upload.wikimedia.org/wikipedia/commons/e/e5/Neptunium2.jpg',uses:''},
{s:'Pu',n:'Plutonium',num:94,c:'#38D9A9',r:10,col:8,econfig:'[Rn] 5f6 7s2',summary:'Plutonium is a transuranic radioactive chemical element with symbol Pu and atomic number 94. It is an actinide metal of silvery-gray appearance that tarnishes when exposed to air, and forms a dull coating when oxidized.',image:'https://upload.wikimedia.org/wikipedia/commons/0/0f/Plutonium_ring.jpg',uses:'Nuclear weapons/reactors, spacecraft power sources'},
{s:'Am',n:'Americium',num:95,c:'#38D9A9',r:10,col:9,econfig:'[Rn] 5f7 7s2',summary:'Americium is a radioactive transuranic chemical element with symbol Am and atomic number 95. This member of the actinide series is located in the periodic table under the lanthanide element europium, and thus by analogy was named after the Americas.',image:'https://upload.wikimedia.org/wikipedia/commons/e/ee/Americium_microscope.jpg',uses:''},
{s:'Cm',n:'Curium',num:96,c:'#38D9A9',r:10,col:10,econfig:'[Rn] 5f7 6d1 7s2',summary:'Curium is a transuranic radioactive chemical element with symbol Cm and atomic number 96. This element of the actinide series was named after Marie and Pierre Curie – both were known for their research on radioactivity.',image:'https://images-of-elements.com/s/curium-glow.jpg',uses:''},
{s:'Bk',n:'Berkelium',num:97,c:'#38D9A9',r:10,col:11,econfig:'[Rn] 5f9 7s2',summary:'Berkelium is a transuranic radioactive chemical element with symbol Bk and atomic number 97. It is a member of the actinide and transuranium element series.',image:'https://upload.wikimedia.org/wikipedia/commons/f/fc/Berkelium.jpg',uses:''},
{s:'Cf',n:'Californium',num:98,c:'#38D9A9',r:10,col:12,econfig:'[Rn] 5f10 7s2',summary:'Californium is a radioactive metallic chemical element with symbol Cf and atomic number 98. The element was first made in 1950 at the University of California Radiation Laboratory in Berkeley, by bombarding curium with alpha particles (helium-4 ions).',image:'https://upload.wikimedia.org/wikipedia/commons/9/93/Californium.jpg',uses:''},
{s:'Es',n:'Einsteinium',num:99,c:'#38D9A9',r:10,col:13,econfig:'[Rn] 5f11 7s2',summary:'Einsteinium is a synthetic element with symbol Es and atomic number 99. It is the seventh transuranic element, and an actinide. Einsteinium was discovered as a component of the debris of the first hydrogen bomb explosion in 1952, and named after Albert Einstein.',image:'https://upload.wikimedia.org/wikipedia/commons/5/55/Einsteinium.jpg',uses:''},
{s:'Fm',n:'Fermium',num:100,c:'#38D9A9',r:10,col:14,econfig:'[Rn] 5f12 7s2',summary:'Fermium is a synthetic element with symbol Fm and atomic number 100. It is a member of the actinide series.',image:'https://upload.wikimedia.org/wikipedia/commons/5/58/Ivy_Mike_-_mushroom_cloud.jpg',uses:''},
{s:'Md',n:'Mendelevium',num:101,c:'#38D9A9',r:10,col:15,econfig:'[Rn] 5f13 7s2',summary:'Mendelevium is a synthetic element with chemical symbol Md (formerly Mv) and atomic number 101.',image:'https://images-of-elements.com/s/mendelevium.jpg',uses:''},
{s:'No',n:'Nobelium',num:102,c:'#38D9A9',r:10,col:16,econfig:'[Rn] 5f14 7s2',summary:'Nobelium is a synthetic chemical element with symbol No and atomic number 102. It is named in honor of Alfred Nobel, the inventor of dynamite and benefactor of science. A radioactive metal, it is the tenth transuranic element and is the penultimate member of the actinide series.',image:'https://images-of-elements.com/nobelium.jpg',uses:''},
{s:'Lr',n:'Lawrencium',num:103,c:'#38D9A9',r:10,col:17,econfig:'[Rn] 5f14 7s2 7p1',summary:'Lawrencium is a synthetic chemical element with chemical symbol Lr (formerly Lw) and atomic number 103. It is named in honor of Ernest Lawrence, inventor of the cyclotron, a device that was used to discover many artificial radioactive elements.',image:'https://images-of-elements.com/lawrencium.jpg',uses:''},
{s:'Rf',n:'Rutherfordium',num:104,c:'#4DABF7',r:7,col:4,econfig:'[Rn] 5f14 6d2 7s2',summary:'Rutherfordium is a chemical element with symbol Rf and atomic number 104, named in honor of physicist Ernest Rutherford.',image:'https://images-of-elements.com/s/rutherfordium.jpg',uses:''},
{s:'Db',n:'Dubnium',num:105,c:'#4DABF7',r:7,col:5,econfig:'*[Rn] 5f14 6d3 7s2',summary:'Dubnium is a chemical element with symbol Db and atomic number 105. It is named after the town of Dubna in Russia (north of Moscow), where it was first produced.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Sg',n:'Seaborgium',num:106,c:'#4DABF7',r:7,col:6,econfig:'*[Rn] 5f14 6d4 7s2',summary:'Seaborgium is a synthetic element with symbol Sg and atomic number 106. Its most stable known isotope, 271Sg, has a half-life of about 1.9 minutes.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Bh',n:'Bohrium',num:107,c:'#4DABF7',r:7,col:7,econfig:'*[Rn] 5f14 6d5 7s2',summary:'Bohrium is a chemical element with symbol Bh and atomic number 107. It is named after Danish physicist Niels Bohr.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Hs',n:'Hassium',num:108,c:'#4DABF7',r:7,col:8,econfig:'*[Rn] 5f14 6d6 7s2',summary:'Hassium is a chemical element with symbol Hs and atomic number 108, named after the German state of Hesse.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Mt',n:'Meitnerium',num:109,c:'#4DABF7',r:7,col:9,econfig:'*[Rn] 5f14 6d7 7s2',summary:'Meitnerium is a chemical element with symbol Mt and atomic number 109. It is an extremely radioactive synthetic element (an element not found in nature that can be created in a laboratory). The most stable known isotope, meitnerium-278, has a half-life of 7.6 seconds.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Ds',n:'Darmstadtium',num:110,c:'#4DABF7',r:7,col:10,econfig:'*[Rn] 5f14 6d9 7s1',summary:'Darmstadtium is a chemical element with symbol Ds and atomic number 110. It is an extremely radioactive synthetic element. The most stable known isotope, darmstadtium-281, has a half-life of approximately 10 seconds.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Rg',n:'Roentgenium',num:111,c:'#4DABF7',r:7,col:11,econfig:'*[Rn] 5f14 6d10 7s1',summary:'Roentgenium is a chemical element with symbol Rg and atomic number 111. It is an extremely radioactive synthetic element (an element that can be created in a laboratory but is not found in nature); the most stable known isotope, roentgenium-282, has a half-life of 2.1 minutes.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Cn',n:'Copernicium',num:112,c:'#4DABF7',r:7,col:12,econfig:'*[Rn] 5f14 6d10 7s2',summary:'Copernicium is a chemical element with symbol Cn and atomic number 112. It is an extremely radioactive synthetic element that can only be created in a laboratory.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Nh',n:'Nihonium',num:113,c:'#9775FA',r:7,col:13,econfig:'*[Rn] 5f14 6d10 7s2 7p1',summary:'Nihonium is a chemical element with atomic number 113. It has a symbol Nh. It is a synthetic element (an element that can be created in a laboratory but is not found in nature) and is extremely radioactive; its most stable known isotope, nihonium-286, has a half-life of 20...',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Fl',n:'Flerovium',num:114,c:'#9775FA',r:7,col:14,econfig:'*[Rn] 5f14 6d10 7s2 7p2',summary:'Flerovium is a superheavy artificial chemical element with symbol Fl and atomic number 114. It is an extremely radioactive synthetic element.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Mc',n:'Moscovium',num:115,c:'#9775FA',r:7,col:15,econfig:'*[Rn] 5f14 6d10 7s2 7p3',summary:'Moscovium is the name of a synthetic superheavy element in the periodic table that has the symbol Mc and has the atomic number 115. It is an extremely radioactive element; its most stable known isotope, moscovium-289, has a half-life of only 220 milliseconds.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Lv',n:'Livermorium',num:116,c:'#9775FA',r:7,col:16,econfig:'*[Rn] 5f14 6d10 7s2 7p4',summary:'Livermorium is a synthetic superheavy element with symbol Lv and atomic number 116. It is an extremely radioactive element that has only been created in the laboratory and has not been observed in nature.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Ts',n:'Tennessine',num:117,c:'#FF922B',r:7,col:17,econfig:'*[Rn] 5f14 6d10 7s2 7p5',summary:'Tennessine is a superheavy artificial chemical element with an atomic number of 117 and a symbol of Ts. Also known as eka-astatine or element 117, it is the second-heaviest known element and penultimate element of the 7th period of the periodic table.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''},
{s:'Og',n:'Oganesson',num:118,c:'#845EF7',r:7,col:18,econfig:'*[Rn] 5f14 6d10 7s2 7p6',summary:'Oganesson is IUPAC\'s name for the transactinide element with the atomic number 118 and element symbol Og. It is also known as eka-radon or element 118, and on the periodic table of the elements it is a p-block element and the last one of the 7th period.',image:'https://images-of-elements.com/s/transactinoid.png',uses:''}
];
const PERIODIC_COMPOUNDS = [
  {a:'Na',b:'Cl',f:'NaCl',n:'Sodium Chloride',c:'Table Salt',fact:'The salt on your food — a violently reactive metal and a toxic gas combine into something you eat every day.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'H',b:'O',f:'H2O',n:'Water',c:'Water',fact:'Two flammable/reactive elements combine into the one thing that puts fires out.',struct:'Bent molecular structure',bond:'Covalent (polar)'},
  {a:'H',b:'Cl',f:'HCl',n:'Hydrogen Chloride',c:'Stomach Acid (when dissolved)',fact:'Your stomach makes this to digest food — concentrated, it dissolves metal.',struct:'Linear diatomic molecule',bond:'Covalent (polar)'},
  {a:'C',b:'O',f:'CO2',n:'Carbon Dioxide',c:'CO2 (what you exhale)',fact:'What plants breathe in and you breathe out.',struct:'Linear molecular structure',bond:'Covalent'},
  {a:'Na',b:'O',f:'Na2O',n:'Sodium Oxide',c:'Sodium Oxide',fact:'Reacts violently with water to form lye (sodium hydroxide).',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Fe',b:'O',f:'Fe2O3',n:'Iron(III) Oxide',c:'Rust',fact:'What happens to iron left out in the rain.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Al',b:'O',f:'Al2O3',n:'Aluminum Oxide',c:'Sapphire & Ruby (in gem form)',fact:'Pure aluminum oxide crystals, colored by trace metals, are sapphires and rubies.',struct:'Ionic crystal lattice (corundum)',bond:'Ionic'},
  {a:'Mg',b:'O',f:'MgO',n:'Magnesium Oxide',c:'Milk of Magnesia (as hydroxide)',fact:'Burns with a blinding white light — used in old photography flashes and fireworks.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Ca',b:'O',f:'CaO',n:'Calcium Oxide',c:'Quicklime',fact:'Reacts with water in a strongly exothermic reaction — used in cement.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Si',b:'O',f:'SiO2',n:'Silicon Dioxide',c:'Quartz / Sand',fact:'The main component of beach sand and the glass in your window.',struct:'Covalent network lattice (quartz)',bond:'Covalent'},
  {a:'N',b:'O',f:'NO2',n:'Nitrogen Dioxide',c:'Smog Gas',fact:'The reddish-brown gas responsible for a lot of urban air pollution.',struct:'Bent molecular structure',bond:'Covalent'},
  {a:'N',b:'H',f:'NH3',n:'Ammonia',c:'Ammonia',fact:'That sharp smell in cleaning products — also essential for making fertilizer.',struct:'Trigonal pyramidal molecule',bond:'Covalent (polar)'},
  {a:'C',b:'H',f:'CH4',n:'Methane',c:'Natural Gas',fact:'The main component of the natural gas that heats homes and stoves.',struct:'Tetrahedral molecule',bond:'Covalent'},
  {a:'S',b:'O',f:'SO2',n:'Sulfur Dioxide',c:'Volcano/Match Smell',fact:'That burnt-match smell — also a major cause of acid rain.',struct:'Bent molecular structure',bond:'Covalent'},
  {a:'H',b:'S',f:'H2S',n:'Hydrogen Sulfide',c:'Rotten Egg Gas',fact:'Responsible for the smell of rotten eggs and some hot springs.',struct:'Bent molecular structure',bond:'Covalent (polar)'},
  {a:'K',b:'Cl',f:'KCl',n:'Potassium Chloride',c:'Salt Substitute',fact:'Used in low-sodium salt substitutes — and, at high doses, lethal injection.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'K',b:'I',f:'KI',n:'Potassium Iodide',c:'Iodized Salt Additive',fact:'Added to table salt to prevent iodine-deficiency disorders.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Ca',b:'Cl',f:'CaCl2',n:'Calcium Chloride',c:'Road Salt / Ice Melt',fact:'Used to melt ice on roads — releases heat as it dissolves.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Mg',b:'Cl',f:'MgCl2',n:'Magnesium Chloride',c:'De-icer / Bath Salts',fact:'Also sold as "magnesium flakes" for relaxing baths.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Ag',b:'Cl',f:'AgCl',n:'Silver Chloride',c:'Photographic Film Compound',fact:'Darkens when exposed to light — the basis of old photographic film.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Cu',b:'O',f:'CuO',n:'Copper(II) Oxide',c:'Black Copper Oxide',fact:'The black coating that forms on old copper pipes and pennies.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Zn',b:'O',f:'ZnO',n:'Zinc Oxide',c:'Sunscreen / Diaper Cream',fact:'The white paste in mineral sunscreen and baby diaper cream.',struct:'Ionic crystal lattice (wurtzite)',bond:'Ionic'},
  {a:'Ti',b:'O',f:'TiO2',n:'Titanium Dioxide',c:'White Pigment',fact:'Makes white paint white, and toothpaste opaque.',struct:'Ionic crystal lattice (rutile)',bond:'Ionic'},
  {a:'H',b:'F',f:'HF',n:'Hydrogen Fluoride',c:'Glass-Etching Acid',fact:'One of the few acids that can dissolve glass itself.',struct:'Linear diatomic molecule',bond:'Covalent (polar)'},
  {a:'H',b:'Br',f:'HBr',n:'Hydrogen Bromide',c:'Hydrobromic Acid',fact:'A strong acid used in organic chemistry synthesis.',struct:'Linear diatomic molecule',bond:'Covalent (polar)'},
  {a:'H',b:'I',f:'HI',n:'Hydrogen Iodide',c:'Hydroiodic Acid',fact:'One of the strongest common acids, stronger than HCl.',struct:'Linear diatomic molecule',bond:'Covalent (polar)'},
  {a:'N',b:'N',f:'N2',n:'Nitrogen Gas',c:'The Air You Breathe (mostly)',fact:'About 78% of the air around you right now.',struct:'Linear diatomic molecule (triple bond)',bond:'Covalent'},
  {a:'O',b:'O',f:'O2',n:'Oxygen Gas',c:'The Oxygen You Breathe',fact:'About 21% of the air, and the part your body actually needs.',struct:'Linear diatomic molecule (double bond)',bond:'Covalent'},
  {a:'H',b:'H',f:'H2',n:'Hydrogen Gas',c:'Hydrogen Fuel',fact:'The most abundant element in the universe, and a rocket fuel component.',struct:'Diatomic molecule (single bond)',bond:'Covalent'},
  {a:'C',b:'C',f:'Diamond/Graphite',n:'Carbon Allotropes',c:'Diamond or Pencil Lead',fact:'Pure carbon can be the hardest natural material or one of the softest, depending on structure.',struct:'Covalent network (diamond) or layered sheets (graphite)',bond:'Covalent'},
  {a:'Na',b:'H',f:'NaH',n:'Sodium Hydride',c:'Sodium Hydride',fact:'Reacts violently and explosively with water.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Ca',b:'C',f:'CaC2',n:'Calcium Carbide',c:'Carbide (old lamp fuel)',fact:'Reacts with water to make acetylene gas — used in old miners\' lamps.',struct:'Ionic crystal lattice',bond:'Ionic (with covalent C≡C unit)'},
  {a:'Fe',b:'S',f:'FeS',n:'Iron(II) Sulfide',c:'Fool\'s Gold (related)',fact:'A classic chemistry-class demo — iron filings and sulfur fused together.',struct:'Ionic/metallic lattice',bond:'Ionic'},
  {a:'Cu',b:'S',f:'CuS',n:'Copper(II) Sulfide',c:'Covellite Mineral',fact:'A naturally occurring mineral, often iridescent blue.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Pb',b:'O',f:'PbO2',n:'Lead Dioxide',c:'Car Battery Component',fact:'Used in the positive plate of lead-acid car batteries.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Sn',b:'O',f:'SnO2',n:'Tin Dioxide',c:'Ceramic Glaze Ingredient',fact:'Used to make ceramic glazes opaque white.',struct:'Ionic crystal lattice (rutile)',bond:'Ionic'},
  {a:'Br',b:'Br',f:'Br2',n:'Bromine',c:'Liquid Bromine',fact:'One of only two elements that are liquid at room temperature.',struct:'Diatomic molecule',bond:'Covalent'},
  {a:'Cl',b:'Cl',f:'Cl2',n:'Chlorine Gas',c:'Pool Chlorine Gas',fact:'Used to disinfect swimming pools and drinking water.',struct:'Diatomic molecule',bond:'Covalent'},
  {a:'P',b:'O',f:'P2O5',n:'Phosphorus Pentoxide',c:'Drying Agent',fact:'So good at absorbing water it\'s used as a powerful desiccant.',struct:'Molecular cage structure',bond:'Covalent'},
  {a:'Al',b:'Cl',f:'AlCl3',n:'Aluminum Chloride',c:'Antiperspirant Ingredient',fact:'The active ingredient in many antiperspirant deodorants.',struct:'Layered/dimeric molecular structure',bond:'Covalent (polar, borderline ionic)'},
  {a:'Zn',b:'Cl',f:'ZnCl2',n:'Zinc Chloride',c:'Soldering Flux',fact:'Used as a flux in soldering to clean metal surfaces.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Ba',b:'O',f:'BaO',n:'Barium Oxide',c:'Glass Additive',fact:'Added to glass to increase its refractive index.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Li',b:'O',f:'Li2O',n:'Lithium Oxide',c:'Ceramic Glass Additive',fact:'Used in some heat-resistant ceramic glass and lithium-ion battery research.',struct:'Ionic crystal lattice',bond:'Ionic'},
  {a:'Au',b:'Cl',f:'AuCl3',n:'Gold(III) Chloride',c:'Gold Plating Compound',fact:'Used in gold plating and as a photosensitizer.',struct:'Dimeric molecular structure',bond:'Covalent (polar)'}
];
const PERIODIC_CELL = 44;
const PERIODIC_TAP_THRESHOLD = 10;

function findCompound(a, b) {
  return PERIODIC_COMPOUNDS.find(c => (c.a===a && c.b===b) || (c.a===b && c.b===a));
}

window.openPeriodicTable = function() {
  const ov = document.getElementById('periodic-overlay');
  ov.style.display = 'flex';
  const grid = document.getElementById('periodic-grid');
  if (grid.children.length) return;

  PERIODIC_ELEMENTS.forEach(e => {
    const tile = document.createElement('div');
    tile.textContent = e.s;
    tile.dataset.symbol = e.s;
    const yOffset = e.r >= 9 ? PERIODIC_CELL/2 : 0;
    tile.style.cssText = `position:absolute;left:${(e.col-1)*PERIODIC_CELL}px;top:${(e.r-1)*PERIODIC_CELL+yOffset}px;` +
      `width:${PERIODIC_CELL-4}px;height:${PERIODIC_CELL-4}px;background:${e.c};color:#000;` +
      `display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;` +
      `border-radius:3px;cursor:grab;user-select:none;touch-action:none;z-index:1;`;
    tile.title = e.n;
    grid.appendChild(tile);
    makeDraggable(tile, e);
  });
};

window.showElementDetail = function(e) {
  document.getElementById('ed-name').textContent = `${e.n} (${e.s})`;
  document.getElementById('ed-number').textContent = e.num;
  document.getElementById('ed-econfig').textContent = e.econfig;
  document.getElementById('ed-summary').textContent = e.summary;
  document.getElementById('ed-uses').textContent = e.uses || 'No widely known everyday use, sir — mostly research/lab contexts.';

  const img = document.getElementById('ed-image');
  const spinner = document.getElementById('ed-spinner');
  spinner.style.display = 'flex';
  img.style.display = 'none';
  img.onload = () => { spinner.style.display = 'none'; img.style.display = 'block'; };
  img.onerror = () => { spinner.textContent = 'No image available'; };
  img.src = e.image;

  document.getElementById('element-detail-overlay').style.display = 'flex';
};

function makeDraggable(tile, elem) {
  let startX, startY, origLeft, origTop, dragging = false, totalMove = 0;

  function onDown(clientX, clientY) {
    dragging = true;
    startX = clientX; startY = clientY;
    origLeft = parseFloat(tile.style.left);
    origTop = parseFloat(tile.style.top);
    totalMove = 0;
    tile.style.zIndex = 100;
    tile.style.cursor = 'grabbing';
  }
  function onMove(clientX, clientY) {
    if (!dragging) return;
    const dx = clientX - startX, dy = clientY - startY;
    totalMove = Math.hypot(dx, dy);
    tile.style.left = (origLeft + dx) + 'px';
    tile.style.top = (origTop + dy) + 'px';
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    tile.style.zIndex = 1;
    tile.style.cursor = 'grab';

    if (totalMove < PERIODIC_TAP_THRESHOLD) {
      // Tap, not a drag — snap back instantly, show detail instead of mixing.
      tile.style.left = origLeft + 'px';
      tile.style.top = origTop + 'px';
      showElementDetail(elem);
      return;
    }

    const myRect = tile.getBoundingClientRect();
    const myCx = myRect.left + myRect.width/2, myCy = myRect.top + myRect.height/2;
    let best = null, bestDist = Infinity;
    document.querySelectorAll('#periodic-grid > div').forEach(other => {
      if (other === tile) return;
      const r = other.getBoundingClientRect();
      const cx = r.left + r.width/2, cy = r.top + r.height/2;
      const dist = Math.hypot(myCx-cx, myCy-cy);
      if (dist < PERIODIC_CELL*0.8 && dist < bestDist) { best = other; bestDist = dist; }
    });

    if (best) {
      const a = elem.s, b = best.dataset.symbol;
      const compound = findCompound(a, b);
      const panel = document.getElementById('periodic-result');
      panel.style.display = 'block';
      if (compound) {
        panel.innerHTML = `<b>${a} + ${b} \u2192 ${compound.f}</b> (${compound.n})<br>` +
          `Structure: ${compound.struct} &middot; Bond: ${compound.bond}<br>` +
          `\uD83D\uDCA1 ${compound.c} — ${compound.fact}`;
      } else {
        panel.innerHTML = `${a} + ${b} \u2192 no well-known everyday compound for this pair, sir — try another combination.`;
      }
    }

    tile.style.transition = 'left .2s, top .2s';
    tile.style.left = origLeft + 'px';
    tile.style.top = origTop + 'px';
    setTimeout(() => tile.style.transition = '', 220);
  }

  tile.addEventListener('mousedown', e => { e.preventDefault(); onDown(e.clientX, e.clientY); });
  document.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  document.addEventListener('mouseup', onUp);

  tile.addEventListener('touchstart', e => { const t = e.touches[0]; onDown(t.clientX, t.clientY); }, {passive:true});
  tile.addEventListener('touchmove', e => { const t = e.touches[0]; onMove(t.clientX, t.clientY); e.preventDefault(); }, {passive:false});
  tile.addEventListener('touchend', onUp);
}

window.openStormPanel = async function() {
  const ov  = document.getElementById('storm-overlay');
  const con = document.getElementById('storm-content');
  ov.style.display = 'flex';
  con.innerHTML = '<div style="color:var(--tdim);text-align:center;padding:1.5rem;">Loading active storms…</div>';
  ov.addEventListener('click', e => { if(e.target===ov) ov.style.display='none'; }, {once:true});

  const alertColor = lvl => lvl==='Red' ? '#ff4444' : lvl==='Orange' ? '#ff9800' : '#4caf50';

  try {
    const r = await safeFetch('https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP');
    const d = r ? await r.json() : null;
    const storms = (d?.features || [])
      .filter(f => f.properties?.eventtype === 'TC')
      .sort((a,b) => {
        const rank = l => l==='Red'?2:l==='Orange'?1:0;
        const ra = rank(a.properties.alertlevel), rb = rank(b.properties.alertlevel);
        if (ra !== rb) return rb - ra;
        return (b.properties.severitydata?.severity||0) - (a.properties.severitydata?.severity||0);
      });

    if (!storms.length) {
      con.innerHTML = '<div style="color:var(--tdim);text-align:center;padding:1.5rem;">No active tropical storms right now, sir.</div>';
      return;
    }

    let html = `<div style="color:var(--c);font-size:.95rem;font-weight:700;letter-spacing:.1em;margin-bottom:.8rem;">🌀 ${storms.length} Active Tropical Storm${storms.length!==1?'s':''} Worldwide</div>`;
    storms.forEach(f => {
      const p     = f.properties;
      const clr   = alertColor(p.alertlevel);
      const sev   = p.severitydata?.severitytext || 'Category unknown';
      const country = p.country || '';
      const report = p.url?.report || '';
      html += `<div style="padding:.9rem 0;border-bottom:1px solid #081830;cursor:pointer;"
                    onclick="${report ? `window.open('${report}','_blank')` : ''}">
        <div style="display:flex;align-items:center;gap:.5rem;">
          <span style="background:${clr};color:#000;font-size:.68rem;font-weight:700;padding:.1rem .5rem;letter-spacing:.05em;">${(p.alertlevel||'').toUpperCase()}</span>
          <span style="color:#fff;font-weight:700;font-size:1rem;">${p.eventname || p.name || 'Unnamed'}</span>
        </div>
        <div style="color:${clr};font-size:.85rem;font-family:monospace;margin-top:.35rem;">${sev}</div>
        ${country ? `<div style="color:#c8e8f8;font-size:.85rem;margin-top:.25rem;">📍 ${country}</div>` : ''}
        <div style="color:#3a7aa0;font-size:.75rem;margin-top:.35rem;">${p.source||''} · tap for full report</div>
      </div>`;
    });
    html += `<a href="https://www.gdacs.org/" target="_blank" style="display:block;margin-top:1rem;background:var(--c);color:#020c1b;text-align:center;padding:.55rem;text-decoration:none;font-size:.88rem;font-weight:700;letter-spacing:.1em;">OPEN GDACS LIVE MAP →</a>`;
    con.innerHTML = html;
  } catch(e) {
    con.innerHTML = `<div style="color:var(--tdim);text-align:center;padding:1.5rem;">Couldn't reach the storm feed just now.<br><a href="https://www.gdacs.org/" target="_blank" style="color:var(--c);">Check GDACS directly →</a></div>`;
  }
};

// ── Voice command hooks for new panels ────────────────────────────────────────
document.addEventListener('henry-voice-cmd', e => {
  const txt = (e.detail||'').toLowerCase();
  if (/space|iss|nasa|asteroid/.test(txt))    openSpacePanel();
  if (/market|stock|crypto|bitcoin/.test(txt)) openMarketsPanel();
  if (/earthquake|radar|earth radar/.test(txt)) openRadarPanel();
  if (/storm tracker|track storms?|typhoon tracker|hurricane tracker|cyclone tracker|active storms?/.test(txt)) openStormPanel();
  if (/periodic table|element mixer|chemistry lab|mix elements/.test(txt)) openPeriodicTable();
});
