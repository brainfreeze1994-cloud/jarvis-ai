// ═══════════════════════════════════════════════════════════════════
(function(){
  'use strict';

  // ── State ────────────────────────────────────────────────────────
  let renderer, scene, camera, globe, clouds, atmosphere, raycaster, mouse;
  let isDragging = false, prevX = 0, prevY = 0;
  let rotX = 0, rotY = 0, rotVX = 0, rotVY = 0;
  const countryMeshes = []; let selectedCountry = null;
  let globeInited = false;
  const animalImageDataUrl = null;

  const COUNTRY_DATA = {
    // lat/lon centers for fly-to, used with search
    'philippines':{ lat:12.8797, lon:121.7740, flag:'🇵🇭', name:'Philippines' },
    'japan':{ lat:36.2048, lon:138.2529, flag:'🇯🇵', name:'Japan' },
    'usa':{ lat:37.0902, lon:-95.7129, flag:'🇺🇸', name:'United States' },
    'united states':{ lat:37.0902, lon:-95.7129, flag:'🇺🇸', name:'United States' },
    'france':{ lat:46.2276, lon:2.2137, flag:'🇫🇷', name:'France' },
    'germany':{ lat:51.1657, lon:10.4515, flag:'🇩🇪', name:'Germany' },
    'brazil':{ lat:-14.2350, lon:-51.9253, flag:'🇧🇷', name:'Brazil' },
    'india':{ lat:20.5937, lon:78.9629, flag:'🇮🇳', name:'India' },
    'china':{ lat:35.8617, lon:104.1954, flag:'🇨🇳', name:'China' },
    'australia':{ lat:-25.2744, lon:133.7751, flag:'🇦🇺', name:'Australia' },
    'canada':{ lat:56.1304, lon:-106.3468, flag:'🇨🇦', name:'Canada' },
    'russia':{ lat:61.5240, lon:105.3188, flag:'🇷🇺', name:'Russia' },
    'uae':{ lat:23.4241, lon:53.8478, flag:'🇦🇪', name:'UAE' },
    'united arab emirates':{ lat:23.4241, lon:53.8478, flag:'🇦🇪', name:'UAE' },
    'uk':{ lat:55.3781, lon:-3.4360, flag:'🇬🇧', name:'United Kingdom' },
    'united kingdom':{ lat:55.3781, lon:-3.4360, flag:'🇬🇧', name:'United Kingdom' },
    'italy':{ lat:41.8719, lon:12.5674, flag:'🇮🇹', name:'Italy' },
    'spain':{ lat:40.4637, lon:-3.7492, flag:'🇪🇸', name:'Spain' },
    'mexico':{ lat:23.6345, lon:-102.5528, flag:'🇲🇽', name:'Mexico' },
    'south korea':{ lat:35.9078, lon:127.7669, flag:'🇰🇷', name:'South Korea' },
    'korea':{ lat:35.9078, lon:127.7669, flag:'🇰🇷', name:'South Korea' },
    'egypt':{ lat:26.8206, lon:30.8025, flag:'🇪🇬', name:'Egypt' },
    'nigeria':{ lat:9.0820, lon:8.6753, flag:'🇳🇬', name:'Nigeria' },
    'south africa':{ lat:-30.5595, lon:22.9375, flag:'🇿🇦', name:'South Africa' },
    'argentina':{ lat:-38.4161, lon:-63.6167, flag:'🇦🇷', name:'Argentina' },
    'turkey':{ lat:38.9637, lon:35.2433, flag:'🇹🇷', name:'Turkey' },
    'saudi arabia':{ lat:23.8859, lon:45.0792, flag:'🇸🇦', name:'Saudi Arabia' },
    'indonesia':{ lat:-0.7893, lon:113.9213, flag:'🇮🇩', name:'Indonesia' },
    'thailand':{ lat:15.8700, lon:100.9925, flag:'🇹🇭', name:'Thailand' },
    'vietnam':{ lat:14.0583, lon:108.2772, flag:'🇻🇳', name:'Vietnam' },
    'malaysia':{ lat:4.2105, lon:101.9758, flag:'🇲🇾', name:'Malaysia' },
    'singapore':{ lat:1.3521, lon:103.8198, flag:'🇸🇬', name:'Singapore' },
    'new zealand':{ lat:-40.9006, lon:174.8860, flag:'🇳🇿', name:'New Zealand' },
    'portugal':{ lat:39.3999, lon:-8.2245, flag:'🇵🇹', name:'Portugal' },
    'greece':{ lat:39.0742, lon:21.8243, flag:'🇬🇷', name:'Greece' },
    'poland':{ lat:51.9194, lon:19.1451, flag:'🇵🇱', name:'Poland' },
    'sweden':{ lat:60.1282, lon:18.6435, flag:'🇸🇪', name:'Sweden' },
    'norway':{ lat:60.4720, lon:8.4689, flag:'🇳🇴', name:'Norway' },
    'netherlands':{ lat:52.1326, lon:5.2913, flag:'🇳🇱', name:'Netherlands' },
    'switzerland':{ lat:46.8182, lon:8.2275, flag:'🇨🇭', name:'Switzerland' },
    'pakistan':{ lat:30.3753, lon:69.3451, flag:'🇵🇰', name:'Pakistan' },
    'bangladesh':{ lat:23.6850, lon:90.3563, flag:'🇧🇩', name:'Bangladesh' },
    'kenya':{ lat:-0.0236, lon:37.9062, flag:'🇰🇪', name:'Kenya' },
    'ethiopia':{ lat:9.1450, lon:40.4897, flag:'🇪🇹', name:'Ethiopia' },
    'colombia':{ lat:4.5709, lon:-74.2973, flag:'🇨🇴', name:'Colombia' },
    'peru':{ lat:-9.1900, lon:-75.0152, flag:'🇵🇪', name:'Peru' },
    'chile':{ lat:-35.6751, lon:-71.5430, flag:'🇨🇱', name:'Chile' },
    'iran':{ lat:32.4279, lon:53.6880, flag:'🇮🇷', name:'Iran' },
    'iraq':{ lat:33.2232, lon:43.6793, flag:'🇮🇶', name:'Iraq' },
    'israel':{ lat:31.0461, lon:34.8516, flag:'🇮🇱', name:'Israel' },
    'jordan':{ lat:30.5852, lon:36.2384, flag:'🇯🇴', name:'Jordan' },
    'kuwait':{ lat:29.3117, lon:47.4818, flag:'🇰🇼', name:'Kuwait' },
    'qatar':{ lat:25.3548, lon:51.1839, flag:'🇶🇦', name:'Qatar' },
    'bahrain':{ lat:25.9304, lon:50.6378, flag:'🇧🇭', name:'Bahrain' },
    'oman':{ lat:21.5126, lon:55.9233, flag:'🇴🇲', name:'Oman' },
    'dubai':{ lat:25.2048, lon:55.2708, flag:'🇦🇪', name:'UAE (Dubai)' },
  };

  // ── Open / Close Map ────────────────────────────────────────────
  window.openGlobeMap = function() {
    document.getElementById('map-overlay').classList.add('open');
    if (!globeInited) { setTimeout(initGlobe, 120); }
  };
  document.getElementById('map-close-btn').addEventListener('click', () => {
    document.getElementById('map-overlay').classList.remove('open');
  });

  // ── Search ──────────────────────────────────────────────────────
  document.getElementById('map-search-btn').addEventListener('click', doMapSearch);
  document.getElementById('map-search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {doMapSearch();}
  });

  function doMapSearch() {
    const q = document.getElementById('map-search-input').value.trim().toLowerCase();
    if (!q) {return;}
    // Check preset
    let match = null;
    for (const [key, val] of Object.entries(COUNTRY_DATA)) {
      if (key === q || val.name.toLowerCase() === q) { match = val; break; }
    }
    // Partial
    if (!match) {
      for (const [key, val] of Object.entries(COUNTRY_DATA)) {
        if (key.includes(q) || val.name.toLowerCase().includes(q)) { match = val; break; }
      }
    }
    if (match) {
      flyToLatLon(match.lat, match.lon);
      fetchCountryInfo(match.name);
    } else {
      // Try via HENRY API
      fetchCountryInfo(document.getElementById('map-search-input').value.trim());
    }
    document.getElementById('map-search-input').value = '';
  }

  // ── Country Ask ─────────────────────────────────────────────────
  document.getElementById('country-ask-btn').addEventListener('click', doCountryAsk);
  document.getElementById('country-ask-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {doCountryAsk();}
  });
  function doCountryAsk() {
    const q = document.getElementById('country-ask-input').value.trim();
    if (!q || !selectedCountry) {return;}
    document.getElementById('country-ask-input').value = '';
    const prompt = `About ${selectedCountry}: ${q}`;
    fetchCountryInfo(selectedCountry, q);
  }

  // ── Init Globe ──────────────────────────────────────────────────
  function initGlobe() {
    if (globeInited) {return;}
    globeInited = true;

    const wrap = document.getElementById('globe-container');
    const W = wrap.clientWidth, H = wrap.clientHeight;

    // Scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 1000);
    camera.position.z = 2.6;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    wrap.appendChild(renderer.domElement);

    // Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lighting
    scene.add(new THREE.AmbientLight(0x222244, 0.6));
    const sunLight = new THREE.DirectionalLight(0x6699ff, 1.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);
    const rimLight = new THREE.DirectionalLight(0x00d4ff, 0.4);
    rimLight.position.set(-4, -2, -4);
    scene.add(rimLight);

    // Stars
    const starsGeo = new THREE.BufferGeometry();
    const starVerts = [];
    for (let i = 0; i < 8000; i++) {
      const r = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starVerts.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xaaccff, size: 0.25, transparent: true, opacity: 0.8 })));

    // Load NASA earth texture (real photo), fall back to canvas if blocked
    const globeGeo = new THREE.SphereGeometry(1, 72, 72);
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    function buildGlobeWithTex(earthTex) {
      const globeMat = new THREE.MeshPhongMaterial({
        map: earthTex,
        specularMap: buildSpecularMap(),
        specular: new THREE.Color(0x112244),
        shininess: 14,
      });
      globe = new THREE.Mesh(globeGeo, globeMat);
      scene.add(globe);
      // Atmosphere + clouds need globe to exist first
      const atmGeo2 = new THREE.SphereGeometry(1.038, 72, 72);
      atmosphere = new THREE.Mesh(atmGeo2, new THREE.MeshPhongMaterial({
        color: 0x0044aa, transparent: true, opacity: 0.12,
        side: THREE.FrontSide, depthWrite: false }));
      scene.add(atmosphere);
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.06,72,72),
        new THREE.MeshPhongMaterial({ color:0x00aaff, transparent:true, opacity:0.05,
          side:THREE.BackSide, depthWrite:false })));
      const ct = buildCloudTexture();
      clouds = new THREE.Mesh(new THREE.SphereGeometry(1.008,72,72),
        new THREE.MeshPhongMaterial({ map:ct, transparent:true, opacity:0.38, depthWrite:false }));
      scene.add(clouds);
      document.getElementById('globe-loading').style.display = 'none';
      flyToLatLon(25.2, 55.3);
      animate();
    }
    // Try NASA texture from three.js examples (public domain)
    loader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
      tex => buildGlobeWithTex(tex),
      undefined,
      () => buildGlobeWithTex(buildEarthTexture()), // canvas fallback
    );

    // HUD circles (atmosphere+clouds added after globe texture loads)
    addHudCircles();

    // Events
    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('mousemove', onMove);
    renderer.domElement.addEventListener('mouseup', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd);
    renderer.domElement.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    // Events wired; animate() is called after globe is created in buildGlobeWithTex
  }

  // ── Canvas Earth Texture ─────────────────────────────────────────
  function buildEarthTexture() {
    const W = 2048, H = 1024;
    const cv = document.createElement('canvas'); cv.width=W; cv.height=H;
    const ctx = cv.getContext('2d');

    // Ocean base
    const oceanGrad = ctx.createLinearGradient(0,0,0,H);
    oceanGrad.addColorStop(0,   '#0a1628');
    oceanGrad.addColorStop(0.5, '#0d2040');
    oceanGrad.addColorStop(1,   '#0a1628');
    ctx.fillStyle = oceanGrad; ctx.fillRect(0,0,W,H);

    // Ocean shimmer
    for (let i = 0; i < 1200; i++) {
      ctx.beginPath();
      ctx.arc(Math.random()*W, Math.random()*H, Math.random()*1.5, 0, Math.PI*2);
      ctx.fillStyle = `rgba(0,120,200,${0.05+Math.random()*0.08})`; ctx.fill();
    }

    // Draw continents as simplified colored regions
    ctx.fillStyle = '#2a5a1a';

    // ── North America ──
    drawLand(ctx, W, H, [
      [0.078,0.23],[0.12,0.18],[0.19,0.18],[0.23,0.24],[0.22,0.31],[0.19,0.33],
      [0.16,0.42],[0.13,0.48],[0.10,0.48],[0.08,0.45],[0.08,0.37],[0.078,0.23],
    ], '#3a6b22');

    // ── South America ──
    drawLand(ctx, W, H, [
      [0.13,0.5],[0.20,0.48],[0.22,0.52],[0.22,0.62],[0.18,0.72],[0.14,0.76],
      [0.12,0.74],[0.11,0.65],[0.12,0.56],[0.13,0.5],
    ], '#2e5e1a');

    // ── Europe ──
    drawLand(ctx, W, H, [
      [0.47,0.21],[0.53,0.19],[0.57,0.22],[0.58,0.26],[0.55,0.29],[0.52,0.3],
      [0.48,0.28],[0.47,0.25],[0.47,0.21],
    ], '#4a7a2a');

    // ── Africa ──
    drawLand(ctx, W, H, [
      [0.48,0.32],[0.56,0.30],[0.60,0.34],[0.60,0.45],[0.57,0.52],[0.54,0.56],
      [0.51,0.56],[0.48,0.52],[0.46,0.43],[0.48,0.32],
    ], '#8a6e24');

    // ── Russia / Eurasia ──
    drawLand(ctx, W, H, [
      [0.52,0.14],[0.60,0.12],[0.72,0.14],[0.82,0.16],[0.84,0.21],[0.78,0.26],
      [0.68,0.28],[0.60,0.28],[0.56,0.26],[0.54,0.22],[0.52,0.14],
    ], '#3e6e20');

    // ── Middle East ──
    drawLand(ctx, W, H, [
      [0.59,0.28],[0.65,0.28],[0.67,0.32],[0.66,0.36],[0.62,0.36],[0.59,0.32],[0.59,0.28],
    ], '#b89a3a');

    // ── South Asia ──
    drawLand(ctx, W, H, [
      [0.68,0.28],[0.76,0.28],[0.78,0.34],[0.76,0.4],[0.72,0.44],[0.68,0.4],[0.66,0.34],[0.68,0.28],
    ], '#4a7a2a');

    // ── SE Asia ──
    drawLand(ctx, W, H, [
      [0.77,0.34],[0.84,0.32],[0.88,0.36],[0.86,0.42],[0.82,0.45],[0.78,0.42],[0.77,0.38],[0.77,0.34],
    ], '#3a6e22');

    // ── East Asia / China ──
    drawLand(ctx, W, H, [
      [0.78,0.24],[0.86,0.22],[0.90,0.24],[0.92,0.28],[0.90,0.34],[0.84,0.35],[0.78,0.34],[0.77,0.30],[0.78,0.24],
    ], '#3d6e22');

    // ── Japan ──
    drawLand(ctx, W, H, [
      [0.92,0.24],[0.94,0.22],[0.95,0.25],[0.94,0.28],[0.92,0.27],[0.92,0.24],
    ], '#4a7a2a');

    // ── Australia ──
    drawLand(ctx, W, H, [
      [0.82,0.58],[0.90,0.56],[0.94,0.60],[0.94,0.68],[0.90,0.72],[0.84,0.72],
      [0.80,0.68],[0.80,0.62],[0.82,0.58],
    ], '#a0822a');

    // ── Antarctica ──
    drawLand(ctx, W, H, [
      [0.0,0.90],[1.0,0.90],[1.0,1.0],[0.0,1.0],[0.0,0.90],
    ], '#d0e8f0');

    // ── Greenland ──
    drawLand(ctx, W, H, [
      [0.20,0.10],[0.26,0.08],[0.28,0.13],[0.26,0.18],[0.22,0.18],[0.20,0.14],[0.20,0.10],
    ], '#c0d8e8');

    // Mountain / desert noise
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 3000; i++) {
      const x=Math.random()*W, y=Math.random()*H;
      ctx.beginPath(); ctx.arc(x,y,Math.random()*2+0.5,0,Math.PI*2);
      ctx.fillStyle = Math.random()>.6 ? '#fff5d0' : '#a09060'; ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Grid lines (lat/lon)
    ctx.strokeStyle = 'rgba(0,180,255,0.05)'; ctx.lineWidth = 1;
    for (let lon = 0; lon < W; lon += W/24) {
      ctx.beginPath(); ctx.moveTo(lon,0); ctx.lineTo(lon,H); ctx.stroke();
    }
    for (let lat = 0; lat < H; lat += H/12) {
      ctx.beginPath(); ctx.moveTo(0,lat); ctx.lineTo(W,lat); ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  }

  function drawLand(ctx, W, H, points, color) {
    ctx.beginPath();
    ctx.moveTo(points[0][0]*W, points[0][1]*H);
    for (let i=1;i<points.length;i++) {ctx.lineTo(points[i][0]*W, points[i][1]*H);}
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    // Border
    ctx.strokeStyle = 'rgba(180,220,100,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function buildSpecularMap() {
    const W=1024,H=512, cv=document.createElement('canvas');
    cv.width=W; cv.height=H;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='#050a12'; ctx.fillRect(0,0,W,H);
    // Ocean = shinier
    ctx.fillStyle='#1a3060'; ctx.fillRect(0,0,W,H);
    const tex=new THREE.CanvasTexture(cv); tex.needsUpdate=true; return tex;
  }

  function buildCloudTexture() {
    const W=2048,H=1024,cv=document.createElement('canvas');
    cv.width=W; cv.height=H;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='transparent'; ctx.fillRect(0,0,W,H);
    // Fluffy cloud blobs
    for (let i=0;i<180;i++) {
      const x=Math.random()*W, y=0.1*H+Math.random()*0.8*H;
      const r=20+Math.random()*55;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,`rgba(255,255,255,${0.15+Math.random()*0.20})`);
      g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
    }
    const tex=new THREE.CanvasTexture(cv); tex.needsUpdate=true; return tex;
  }

  function addHudCircles() {
    for (let i=0;i<3;i++) {
      const r=[1.15,1.22,1.32][i];
      const dash=[[0.04,0.08],[0.02,0.12],[0.015,0.04]][i];
      const geo=new THREE.BufferGeometry();
      const pts=[]; const segs=256;
      for(let j=0;j<=segs;j++){
        const a=(j/segs)*Math.PI*2;
        pts.push(Math.cos(a)*r,0,Math.sin(a)*r);
      }
      geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
      const mat=new THREE.LineBasicMaterial({ color:0x00aaff,opacity:[0.35,0.18,0.12][i],transparent:true });
      const ring=new THREE.Line(geo,mat);
      ring.rotation.x=Math.PI/2*(0.2+i*0.1);
      scene.add(ring);
    }
  }

  // ── Fly To Lat/Lon ──────────────────────────────────────────────
  function flyToLatLon(lat, lon) {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    // Target globe rotation so this point faces camera
    const targetRotY = -lonRad;
    const targetRotX = latRad * 0.6;
    // Animate over ~1.5s
    const startX = globe.rotation.x, startY = globe.rotation.y;
    const startT = performance.now();
    function step(now) {
      const p = Math.min((now - startT) / 1500, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      globe.rotation.x = startX + (targetRotX - startX) * ease;
      globe.rotation.y = startY + (targetRotY - startY) * ease;
      clouds.rotation.x = globe.rotation.x;
      clouds.rotation.y = globe.rotation.y + 0.02;
      atmosphere.rotation.x = globe.rotation.x;
      atmosphere.rotation.y = globe.rotation.y;
      rotX = globe.rotation.x; rotY = globe.rotation.y;
      if (p < 1) {requestAnimationFrame(step);}
    }
    requestAnimationFrame(step);
  }

  // ── Click Detection (pick country by pixel color / region) ──────
  function onClick(e) {
    if (isDragging) {return;}
    const rect = renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    const hits = raycaster.intersectObject(globe);
    if (!hits.length) {return;}

    const hit = hits[0];
    // UV is baked into geometry — it moves WITH the texture so no rotation correction needed
    const uv = hit.uv;
    const lon = (uv.x - 0.5) * 360;   // -180 to +180
    const lat = (uv.y - 0.5) * 180;   // -90 to +90 (uv.y=1 = north pole)
    console.log('[HENRY Globe] uv:', uv.x.toFixed(3), uv.y.toFixed(3), '→ lat:', lat.toFixed(1), 'lon:', lon.toFixed(1));
    document.getElementById('globe-hint').textContent = `LAT ${lat.toFixed(1)}°  LON ${lon.toFixed(1)}°`;
    // Ask HENRY to identify country from lat/lon — no bounding box needed
    fetchCountryByLatLon(lat, lon);
  }

  function fetchCountryByLatLon(lat, lon) {
    document.getElementById('country-idle').style.display = 'none';
    document.getElementById('country-info-content').style.display = 'none';
    document.getElementById('country-loading').style.display = 'block';

    // Ask HENRY which country is at these coordinates
    const prompt = `What country or territory is located at latitude ${lat.toFixed(2)}°, longitude ${lon.toFixed(2)}°? Reply with ONLY the country name, nothing else. If it is ocean, reply "Ocean".`;
    fetch('/api/jarvis', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ messages:[{ role:'user',text:prompt }], overrideSystem:'You are a geography expert. Answer with only the country name or "Ocean".' }),
    })
      .then(r=>r.json())
      .then(data=>{
        const raw = (data.reply||'').replace(/\[EMOTION:[^\]]+\]/g,'').trim();
        const country = raw.split('\n')[0].replace(/[*_#]/g,'').trim();
        if (!country || country.toLowerCase()==='ocean' || country.toLowerCase().includes('ocean') || country.toLowerCase().includes('water')) {
          document.getElementById('country-loading').style.display='none';
          const content=document.getElementById('country-info-content');
          content.style.display='block';
          content.innerHTML=`<div style="padding:1rem;color:var(--tdim);text-align:center;line-height:2">🌊 OCEAN / NO LAND<br><small>lat ${lat.toFixed(1)}° lon ${lon.toFixed(1)}°</small></div>`;
        } else {
          selectedCountry = country;
          fetchCountryInfo(country);
        }
      })
      .catch(()=>{
        document.getElementById('country-loading').style.display='none';
        document.getElementById('country-idle').style.display='flex';
      });
  }

  function latLonToCountry(lat, lon) {
    // Priority order matters — smaller countries first to avoid being swallowed by larger ones
    const regions = [
      // Southeast Asia (check before Indonesia/Australia overlap)
      { name:'Singapore',     latMin:1.1, latMax:1.5, lonMin:103.5,lonMax:104.1 },
      { name:'Philippines',   latMin:4,   latMax:22,  lonMin:116,  lonMax:128 },
      { name:'Vietnam',       latMin:8,   latMax:24,  lonMin:102,  lonMax:110 },
      { name:'Thailand',      latMin:5,   latMax:21,  lonMin:97,   lonMax:106 },
      { name:'Malaysia',      latMin:1,   latMax:8,   lonMin:99,   lonMax:119 },
      { name:'Indonesia',     latMin:-11, latMax:6,   lonMin:95,   lonMax:141 },
      { name:'Myanmar',       latMin:9,   latMax:29,  lonMin:92,   lonMax:102 },
      { name:'Cambodia',      latMin:9,   latMax:15,  lonMin:102,  lonMax:108 },
      { name:'Laos',          latMin:13,  latMax:23,  lonMin:100,  lonMax:108 },
      // East Asia
      { name:'Japan',         latMin:24,  latMax:46,  lonMin:129,  lonMax:146 },
      { name:'South Korea',   latMin:33,  latMax:39,  lonMin:124,  lonMax:130 },
      { name:'North Korea',   latMin:37,  latMax:43,  lonMin:124,  lonMax:130 },
      { name:'Taiwan',        latMin:21,  latMax:26,  lonMin:119,  lonMax:122 },
      { name:'China',         latMin:15,  latMax:54,  lonMin:73,   lonMax:135 },
      { name:'Mongolia',      latMin:41,  latMax:52,  lonMin:87,   lonMax:120 },
      // South Asia
      { name:'Sri Lanka',     latMin:5.9, latMax:9.8, lonMin:79.7, lonMax:81.9 },
      { name:'Bangladesh',    latMin:20,  latMax:27,  lonMin:88,   lonMax:93 },
      { name:'Nepal',         latMin:26,  latMax:30,  lonMin:80,   lonMax:89 },
      { name:'Pakistan',      latMin:23,  latMax:37,  lonMin:61,   lonMax:77 },
      { name:'India',         latMin:6,   latMax:36,  lonMin:68,   lonMax:97 },
      { name:'Afghanistan',   latMin:29,  latMax:39,  lonMin:60,   lonMax:75 },
      // Middle East
      { name:'UAE',           latMin:22,  latMax:27,  lonMin:51,   lonMax:57 },
      { name:'Qatar',         latMin:24,  latMax:27,  lonMin:50,   lonMax:52 },
      { name:'Kuwait',        latMin:28,  latMax:30,  lonMin:46,   lonMax:49 },
      { name:'Bahrain',       latMin:25.8,latMax:26.4,lonMin:50.3, lonMax:50.8 },
      { name:'Oman',          latMin:16,  latMax:26,  lonMin:52,   lonMax:60 },
      { name:'Yemen',         latMin:12,  latMax:19,  lonMin:42,   lonMax:54 },
      { name:'Saudi Arabia',  latMin:16,  latMax:33,  lonMin:36,   lonMax:56 },
      { name:'Iraq',          latMin:29,  latMax:38,  lonMin:38,   lonMax:49 },
      { name:'Iran',          latMin:25,  latMax:40,  lonMin:44,   lonMax:64 },
      { name:'Israel',        latMin:29,  latMax:34,  lonMin:34,   lonMax:36 },
      { name:'Jordan',        latMin:29,  latMax:33,  lonMin:35,   lonMax:39 },
      { name:'Syria',         latMin:32,  latMax:37,  lonMin:35,   lonMax:43 },
      { name:'Lebanon',       latMin:33,  latMax:34.7,lonMin:35,   lonMax:37 },
      { name:'Turkey',        latMin:35,  latMax:42,  lonMin:26,   lonMax:45 },
      // Europe
      { name:'Iceland',       latMin:63,  latMax:67,  lonMin:-25,  lonMax:-13 },
      { name:'Norway',        latMin:57,  latMax:71,  lonMin:4,    lonMax:32 },
      { name:'Sweden',        latMin:55,  latMax:70,  lonMin:10,   lonMax:26 },
      { name:'Finland',       latMin:59,  latMax:70,  lonMin:20,   lonMax:32 },
      { name:'Denmark',       latMin:54,  latMax:58,  lonMin:8,    lonMax:15 },
      { name:'United Kingdom',latMin:49,  latMax:61,  lonMin:-8,   lonMax:2 },
      { name:'Ireland',       latMin:51,  latMax:56,  lonMin:-10,  lonMax:-6 },
      { name:'Netherlands',   latMin:50,  latMax:54,  lonMin:3,    lonMax:8 },
      { name:'Belgium',       latMin:49,  latMax:52,  lonMin:2,    lonMax:7 },
      { name:'Portugal',      latMin:36,  latMax:42,  lonMin:-10,  lonMax:-6 },
      { name:'Spain',         latMin:35,  latMax:44,  lonMin:-10,  lonMax:4 },
      { name:'France',        latMin:41,  latMax:51,  lonMin:-5,   lonMax:10 },
      { name:'Switzerland',   latMin:45,  latMax:48,  lonMin:6,    lonMax:10 },
      { name:'Germany',       latMin:47,  latMax:55,  lonMin:6,    lonMax:15 },
      { name:'Poland',        latMin:49,  latMax:55,  lonMin:14,   lonMax:25 },
      { name:'Czech Republic',latMin:48,  latMax:51,  lonMin:12,   lonMax:19 },
      { name:'Austria',       latMin:46,  latMax:49,  lonMin:9,    lonMax:17 },
      { name:'Italy',         latMin:36,  latMax:48,  lonMin:6,    lonMax:19 },
      { name:'Greece',        latMin:35,  latMax:42,  lonMin:20,   lonMax:29 },
      { name:'Romania',       latMin:43,  latMax:48,  lonMin:22,   lonMax:30 },
      { name:'Ukraine',       latMin:44,  latMax:53,  lonMin:22,   lonMax:40 },
      { name:'Russia',        latMin:41,  latMax:82,  lonMin:25,   lonMax:190 },
      // Africa
      { name:'Morocco',       latMin:27,  latMax:36,  lonMin:-14,  lonMax:-1 },
      { name:'Algeria',       latMin:18,  latMax:38,  lonMin:-9,   lonMax:12 },
      { name:'Tunisia',       latMin:30,  latMax:38,  lonMin:7,    lonMax:12 },
      { name:'Libya',         latMin:19,  latMax:34,  lonMin:9,    lonMax:26 },
      { name:'Egypt',         latMin:22,  latMax:32,  lonMin:24,   lonMax:37 },
      { name:'Sudan',         latMin:9,   latMax:24,  lonMin:21,   lonMax:39 },
      { name:'Ethiopia',      latMin:3,   latMax:15,  lonMin:33,   lonMax:48 },
      { name:'Kenya',         latMin:-5,  latMax:5,   lonMin:34,   lonMax:42 },
      { name:'Nigeria',       latMin:4,   latMax:14,  lonMin:2,    lonMax:15 },
      { name:'Ghana',         latMin:4,   latMax:12,  lonMin:-4,   lonMax:2 },
      { name:'South Africa',  latMin:-35, latMax:-22, lonMin:16,   lonMax:33 },
      { name:'Tanzania',      latMin:-12, latMax:0,   lonMin:29,   lonMax:41 },
      { name:'Congo',         latMin:-5,  latMax:5,   lonMin:16,   lonMax:32 },
      { name:'Angola',        latMin:-18, latMax:-4,  lonMin:11,   lonMax:25 },
      { name:'Mozambique',    latMin:-27, latMax:-10, lonMin:32,   lonMax:41 },
      { name:'Madagascar',    latMin:-26, latMax:-12, lonMin:43,   lonMax:51 },
      // Americas
      { name:'Canada',        latMin:41,  latMax:84,  lonMin:-141, lonMax:-52 },
      { name:'United States', latMin:24,  latMax:50,  lonMin:-125, lonMax:-66 },
      { name:'Mexico',        latMin:14,  latMax:33,  lonMin:-118, lonMax:-86 },
      { name:'Cuba',          latMin:19,  latMax:23,  lonMin:-85,  lonMax:-74 },
      { name:'Colombia',      latMin:-4,  latMax:13,  lonMin:-79,  lonMax:-67 },
      { name:'Venezuela',     latMin:0,   latMax:13,  lonMin:-74,  lonMax:-60 },
      { name:'Peru',          latMin:-18, latMax:0,   lonMin:-82,  lonMax:-68 },
      { name:'Brazil',        latMin:-34, latMax:5,   lonMin:-74,  lonMax:-34 },
      { name:'Bolivia',       latMin:-23, latMax:-9,  lonMin:-70,  lonMax:-57 },
      { name:'Chile',         latMin:-56, latMax:-17, lonMin:-76,  lonMax:-66 },
      { name:'Argentina',     latMin:-55, latMax:-22, lonMin:-74,  lonMax:-53 },
      // Oceania
      { name:'Australia',     latMin:-44, latMax:-10, lonMin:113,  lonMax:154 },
      { name:'New Zealand',   latMin:-47, latMax:-34, lonMin:166,  lonMax:178 },
      { name:'Papua New Guinea',latMin:-11,latMax:-1, lonMin:140,  lonMax:156 },
    ];
    for (const r of regions) {
      if (lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax) {return r.name;}
    }
    if (lat > 65) {return 'Arctic Region';}
    if (lat < -65) {return 'Antarctica';}
    return null;
  }

  // ── Fetch Country Info ──────────────────────────────────────────
  function fetchCountryInfo(country, customQ) {
    selectedCountry = country;
    const idle   = document.getElementById('country-idle');
    const loader = document.getElementById('country-loading');
    const content= document.getElementById('country-info-content');
    idle.style.display   = 'none';
    content.style.display= 'none';
    loader.style.display = 'block';

    const prompt = customQ
      ? `For ${country}: ${customQ}. Answer concisely in 2-3 sentences.`
      : `Give me a concise Intel briefing for ${country} covering: flag emoji, capital city, estimated population, history (2 sentences), culture (2 sentences), tourism highlights (3 places), traditional food (3 dishes), economy summary (1 sentence). Use headers: HISTORY, CULTURE, TOURISM, FOOD, ECONOMY.`;

    // Also fetch a short spoken summary (2-3 sentences max) for TTS
    const spokenPrompt = `In exactly 2 sentences, summarize ${country} for a voice assistant: mention the capital, population, and one famous thing. No markdown, no bullet points, plain speech only.`;

    fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', text: prompt }],
        overrideSystem: 'You are H.E.N.R.Y, an AI intel analyst. Provide factual, engaging country briefings. Always start with the country\'s flag emoji and name as a header. Be informative but concise.',
      }),
    })
      .then(r => r.json())
      .then(data => {
        loader.style.display = 'none';
        content.style.display = 'block';
        const reply = data.reply || 'No data available.';
        renderCountryInfo(country, reply);
        // Fetch a clean short spoken summary for TTS
        fetch('/api/jarvis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', text: spokenPrompt }],
            overrideSystem: 'You are a geography voice assistant. Give a 2-sentence plain spoken summary with no markdown.',
          }),
        })
          .then(r2 => r2.json())
          .then(d2 => {
            const spoken = (d2.reply || '').replace(/\[EMOTION:[^\]]+\]/g,'').replace(/[*_#`]/g,'').trim();
            if (window.speak && spoken) {speak(spoken);}
          })
          .catch(() => {});
      })
      .catch(() => {
        loader.style.display = 'none';
        content.style.display = 'block';
        renderCountryInfo(country, `Unable to retrieve intel for ${country}.`);
      });
  }

  function renderCountryInfo(country, reply) {
    const content = document.getElementById('country-info-content');
    // Get flag
    const cKey = country.toLowerCase();
    const preset = Object.values(COUNTRY_DATA).find(v => v.name.toLowerCase() === cKey) ||
                   Object.entries(COUNTRY_DATA).find(([k]) => k===cKey)?.[1];
    const flag = preset?.flag || '🌍';

    content.innerHTML = `
      <div class="c-country-header">
        <div class="c-country-flag">${flag}</div>
        <div class="c-country-name">${country.toUpperCase()}</div>
      </div>
      <div class="c-info-block" data-label="◈ INTEL REPORT">
        <div class="c-info-text">${(window.marked ? window.marked.parse(reply) : reply.replace(/\n/g,'<br>'))}</div>
      </div>
      <div class="c-quick-btns">
        <button class="r-chip" onclick="document.getElementById('country-ask-input').value='What are visa requirements?'">Visa Requirements</button>
        <button class="r-chip" onclick="document.getElementById('country-ask-input').value='What is the currency and exchange rate?'">Currency</button>
        <button class="r-chip" onclick="document.getElementById('country-ask-input').value='What is the best time to visit?'">Best Time to Visit</button>
        <button class="r-chip" onclick="document.getElementById('country-ask-input').value='What languages are spoken?'">Languages</button>
        <button class="r-chip" onclick="copyCountryToChat()">Send to HENRY Chat →</button>
      </div>`;
  }

  window.copyCountryToChat = function() {
    if (!selectedCountry) {return;}
    document.getElementById('map-overlay').classList.remove('open');
    const ti = document.getElementById('text-input');
    ti.value = `Tell me about ${selectedCountry} — history, culture, tourism, food, and population.`;
    ti.dispatchEvent(new Event('input'));
    ti.focus();
  };

  // ── Interaction ─────────────────────────────────────────────────
  let zoom = 2.6, touchDist0 = null;
  function onDown(e) { isDragging=false; prevX=e.clientX; prevY=e.clientY; e.target.addEventListener('mousemove',trackDrag); }
  function trackDrag(e) { isDragging=true; }
  function onMove(e) {
    if (!(e.buttons&1)) {return;}
    const dx=e.clientX-prevX, dy=e.clientY-prevY;
    rotVY += dx*0.006; rotVX += dy*0.006;
    prevX=e.clientX; prevY=e.clientY;
  }
  function onUp(e) { e.target.removeEventListener('mousemove',trackDrag); }
  function onWheel(e) { zoom=Math.max(1.4,Math.min(5,zoom+e.deltaY*0.003)); }
  function onTouchStart(e) {
    if(e.touches.length===1){isDragging=false;prevX=e.touches[0].clientX;prevY=e.touches[0].clientY;}
    if(e.touches.length===2){touchDist0=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);}
  }
  function onTouchMove(e) {
    if(e.touches.length===1){
      isDragging=true;
      const dx=e.touches[0].clientX-prevX, dy=e.touches[0].clientY-prevY;
      rotVY+=dx*0.007; rotVX+=dy*0.007;
      prevX=e.touches[0].clientX; prevY=e.touches[0].clientY;
      e.preventDefault();
    }
    if(e.touches.length===2&&touchDist0){
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      zoom=Math.max(1.4,Math.min(5,zoom*(touchDist0/d)));
      touchDist0=d; e.preventDefault();
    }
  }
  function onTouchEnd(e) {
    if(!isDragging&&e.changedTouches.length===1){
      const t=e.changedTouches[0];
      onClick({ clientX:t.clientX,clientY:t.clientY });
    }
    isDragging=false; touchDist0=null;
  }
  function onResize() {
    const w=document.getElementById('globe-container');
    camera.aspect=w.clientWidth/w.clientHeight; camera.updateProjectionMatrix();
    renderer.setSize(w.clientWidth,w.clientHeight);
  }

  // ── Render Loop ─────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    // Apply velocity
    rotX+=rotVX; rotY+=rotVY;
    rotVX*=0.88; rotVY*=0.88;
    // Auto-slow-spin when idle
    if(Math.abs(rotVX)<0.0005&&Math.abs(rotVY)<0.0005) {rotY+=0.0008;}

    globe.rotation.x=rotX; globe.rotation.y=rotY;
    clouds.rotation.x=rotX*0.97; clouds.rotation.y=rotY+performance.now()*0.00005;
    atmosphere.rotation.x=rotX; atmosphere.rotation.y=rotY;

    camera.position.z=zoom;
    renderer.render(scene,camera);
  }

})();
