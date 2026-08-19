(async () => {  const overlay    = document.getElementById('plant-overlay');
  const dropZone   = document.getElementById('plant-drop-zone');
  const previewWrap= document.getElementById('plant-preview');
  const previewImg = document.getElementById('plant-preview-img');
  const fileInput  = document.getElementById('plant-file-input');
  const changeBtn  = document.getElementById('plant-change-btn');
  const cancelBtn  = document.getElementById('plant-cancel-btn');
  const scanBtn    = document.getElementById('plant-scan-btn');
  let plantDataUrl = null;

  window.openPlantScanner = function() {
    overlay.classList.add('open');
    reset();
  };
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if(e.target===overlay) {close();} });

  function close() { overlay.classList.remove('open'); reset(); }
  function reset() {
    plantDataUrl = null;
    dropZone.style.display = '';
    previewWrap.style.display = 'none';
    previewImg.src = '';
    fileInput.value = '';
    scanBtn.disabled = true;
  }

  dropZone.addEventListener('click', () => fileInput.click());
  changeBtn.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor='#00ff80'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor=''; });
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.style.borderColor='';
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) {loadFile(f);}
  });
  fileInput.addEventListener('change', () => { if(fileInput.files[0]) {loadFile(fileInput.files[0]);} });

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      plantDataUrl = e.target.result;
      previewImg.src = plantDataUrl;
      dropZone.style.display = 'none';
      previewWrap.style.display = 'block';
      scanBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  scanBtn.addEventListener('click', async () => {
    if (!plantDataUrl) {return;}
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ ANALYZING…';
    close();

    const chatInner  = document.getElementById('chat-inner');
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {emptyState.style.display = 'none';}

    // User message
    const userRow = document.createElement('div');
    userRow.className = 'msg-row user';
    userRow.innerHTML = `
      <div class="msg-avatar user-av">YOU</div>
      <div class="msg-bubble">
        🌿 Identify this plant<br>
        <div class="img-thumb-row">
          <img src="${plantDataUrl}" onclick="window.open('${plantDataUrl}')" style="width:80px;height:80px;object-fit:cover;border:1px solid rgba(0,255,128,.3);cursor:pointer;"/>
        </div>
      </div>`;
    chatInner.appendChild(userRow);

    // Typing indicator
    const typingRow = document.createElement('div');
    typingRow.className = 'msg-row henry';
    typingRow.innerHTML = '<div class="msg-avatar henry-av">HNR</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
    chatInner.appendChild(typingRow);
    document.getElementById('chat-area').scrollTop = 99999;

    try {
      // Compress image
      const compressed = await (async (dataUrl, maxPx, q) => {
        return new Promise(res => {
          const img = new Image();
          img.onload = () => {
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = img.width * scale; c.height = img.height * scale;
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            res(c.toDataURL('image/jpeg', q));
          };
          img.src = dataUrl;
        });
      })(plantDataUrl, 768, 0.72);

      const base64 = compressed.split(',')[1];
      const r = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role:'user', text:'What plant is in this photo? Identify and tell me: common name, scientific name, plant family, native region, ideal growing conditions (light, water, soil, temperature), toxicity (safe for pets/humans?), medicinal or culinary uses if any, and 2 fascinating facts. Format it beautifully and be thorough.' }],
          imageBase64: base64,
        }),
      });
      const data = await r.json();
      typingRow.remove();

      const reply = data.reply || 'I could not identify the plant, sir. Please try a clearer photo.';
      const cleanReply = reply.replace(/\[EMOTION:[a-z]+\]\s*/gi, '').trim();
      const henryRow = document.createElement('div');
      henryRow.className = 'msg-row henry';
      henryRow.innerHTML = `<div class="msg-avatar henry-av">HNR</div>
        <div class="msg-bubble">${window.marked ? window.marked.parse(cleanReply) : cleanReply.replace(/\n/g,'<br>')}</div>`;
      chatInner.appendChild(henryRow);
      document.getElementById('chat-area').scrollTop = 99999;
      if (window.speak) {window.speak(cleanReply);}

    } catch(err) {
      typingRow.remove();
      const henryRow = document.createElement('div');
      henryRow.className = 'msg-row henry';
      henryRow.innerHTML = `<div class="msg-avatar henry-av">HNR</div>
        <div class="msg-bubble">My plant recognition module hit a snag, sir. Please try again with a clearer photo.</div>`;
      chatInner.appendChild(henryRow);
    }
    scanBtn.textContent = '🌿 IDENTIFY PLANT';
    scanBtn.disabled = false;
  });

})();
