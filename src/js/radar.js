// ═══════════════════════════════════════════════════════════════════
(function(){
  'use strict';

  const overlay    = document.getElementById('animal-overlay');
  const dropZone   = document.getElementById('animal-drop-zone');
  const previewWrap= document.getElementById('animal-preview');
  const previewImg = document.getElementById('animal-preview-img');
  const fileInput  = document.getElementById('animal-file-input');
  const changeBtn  = document.getElementById('animal-change-btn');
  const cancelBtn  = document.getElementById('animal-cancel-btn');
  const scanBtn    = document.getElementById('animal-scan-btn');
  let animalDataUrl = null;

  // ── Open/Close ───────────────────────────────────────────────────
  window.openAnimalScanner = function() {
    overlay.classList.add('open');
    resetScanner();
  };
  cancelBtn.addEventListener('click', closeScanner);
  overlay.addEventListener('click', e => { if(e.target===overlay) {closeScanner();} });
  function closeScanner() {
    overlay.classList.remove('open');
    resetScanner();
  }
  function resetScanner() {
    animalDataUrl = null;
    dropZone.style.display = '';
    previewWrap.style.display = 'none';
    previewImg.src = '';
    fileInput.value = '';
    scanBtn.disabled = true;
  }

  // ── File Selection ───────────────────────────────────────────────
  dropZone.addEventListener('click', () => fileInput.click());
  changeBtn.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor='#00ff99'; });
  dropZone.addEventListener('dragleave', () => dropZone.style.borderColor='');
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.style.borderColor='';
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) {loadAnimalFile(f);}
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) {loadAnimalFile(fileInput.files[0]);}
  });

  function loadAnimalFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      animalDataUrl = e.target.result;
      previewImg.src = animalDataUrl;
      dropZone.style.display = 'none';
      previewWrap.style.display = 'block';
      scanBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  // ── Scan / Identify ──────────────────────────────────────────────
  scanBtn.addEventListener('click', async () => {
    if (!animalDataUrl) {return;}
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ ANALYZING…';

    // Close scanner and show in chat
    closeScanner();

    // Show in HENRY chat
    const chatInner = document.getElementById('chat-inner');
    const emptyState= document.getElementById('empty-state');
    if (emptyState) {emptyState.style.display='none';}

    // User message with image
    const userRow = document.createElement('div');
    userRow.className = 'msg-row user';
    userRow.innerHTML = `
      <div class="msg-avatar user-av">YOU</div>
      <div class="msg-bubble">
        🐾 Identify this animal<br>
        <div class="img-thumb-row">
          <img src="${animalDataUrl}" onclick="window.open('${animalDataUrl}')" style="width:80px;height:80px;object-fit:cover;border:1px solid rgba(0,255,153,.3);cursor:pointer;"/>
        </div>
      </div>`;
    chatInner.appendChild(userRow);

    // Typing indicator
    const typingRow = document.createElement('div');
    typingRow.className='msg-row henry';
    typingRow.innerHTML='<div class="msg-avatar henry-av">HNR</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
    chatInner.appendChild(typingRow);
    document.getElementById('chat-area').scrollTop = 99999;

    try {
      // Compress image to save bandwidth
      const compressed = await compressImage(animalDataUrl, 768, 0.72);
      const base64 = compressed.split(',')[1];

      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role:'user', text:'What animal is in this photo? Tell me: species name, common name, where it lives (continents/regions/habitats), diet, behavior, conservation status, and 2 interesting facts. Be engaging and detailed.' }],
          imageBase64: base64,
        }),
      });
      const data = await res.json();
      typingRow.remove();

      const reply = data.reply || 'I could not identify the animal, sir. Please try a clearer photo.';
      const henryRow = document.createElement('div');
      henryRow.className='msg-row henry';
      henryRow.innerHTML=`<div class="msg-avatar henry-av">HNR</div>
        <div class="msg-bubble">${window.marked ? window.marked.parse(reply) : reply.replace(/\n/g,'<br>')}</div>`;
      chatInner.appendChild(henryRow);
      document.getElementById('chat-area').scrollTop = 99999;

      // TTS
      if (window.speak) {window.speak(reply);}

    } catch(err) {
      typingRow.remove();
      const henryRow = document.createElement('div');
      henryRow.className='msg-row henry';
      henryRow.innerHTML=`<div class="msg-avatar henry-av">HNR</div>
        <div class="msg-bubble">Scanner malfunction, sir. ${err.message}</div>`;
      chatInner.appendChild(henryRow);
    }
    scanBtn.textContent = '🔬 IDENTIFY ANIMAL';
    scanBtn.disabled = false;
  });

  function compressImage(dataUrl, maxPx, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxPx/img.width, maxPx/img.height, 1);
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width*ratio);
        cv.height= Math.round(img.height*ratio);
        cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
        resolve(cv.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  }

  // Expose speak to animal scanner
  document.addEventListener('DOMContentLoaded', () => {});
})();
