// ═══════════════════════════════════════════════════════

// ── Open / Close ──────────────────────────────────────
function openBrain() {
  document.getElementById('brain-overlay').classList.add('open');
  document.getElementById('brain-grid-view').style.display='';
  document.getElementById('brain-panel').classList.remove('open');
}
function closeBrain() {
  document.getElementById('brain-overlay').classList.remove('open');
  brainStopAll();
}
function brainBack() {
  brainStopAll();
  document.getElementById('brain-grid-view').style.display='';
  document.getElementById('brain-panel').classList.remove('open');
}
function showBrainPanel(html) {
  document.getElementById('brain-grid-view').style.display='none';
  document.getElementById('brain-panel-inner').innerHTML = html;
  document.getElementById('brain-panel').classList.add('open');
}
function sendToChat(msg) {
  closeBrain();
  const inp = document.getElementById('text-input');
  if (inp) { inp.value = msg; }
  // trigger send
  const ev = new KeyboardEvent('keydown',{key:'Enter',bubbles:true});
  setTimeout(()=>{ if(inp) inp.dispatchEvent(ev); },100);
}

// ── Global brain state ────────────────────────────────
let brainTimer = null;
let brainStep  = 0;
let brainScript= [];
let brainPaused= false;
let brainScore = parseInt(localStorage.getItem('henry_brain_score')||'0');
let brainStreak= parseInt(localStorage.getItem('henry_brain_streak')||'0');
let brainCorrect = '';
let brainTts   = null;

function brainStopAll() {
  if(brainTimer) { clearTimeout(brainTimer); brainTimer=null; }
  if(window.speechSynthesis) window.speechSynthesis.cancel();
}

function brainSpeak(text) {
  if(!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate=0.85; u.pitch=0.88;
  window.speechSynthesis.speak(u);
}

// ── Router ────────────────────────────────────────────
function openBrainModule(mod) {
  brainStopAll();
  brainStep=0; brainScript=[]; brainPaused=false;
  switch(mod) {
    case 'mental':    renderMentalImagery(); break;
    case 'dmn':       renderDMN(); break;
    case 'plasticity':renderPlasticity(); break;
    case 'sensory':   renderSensory(); break;
    case 'memory':    renderMemoryBanks(); break;
    case 'workspace': renderWorkspace(); break;
    case 'vision':    renderVision(); break;
    case 'smartmem':  renderSmartMem(); break;
    case 'dashboard': renderDashboard(); break;
    case 'games':     renderGames(); break;
    case 'tracking':  renderTracking(); break;
    case 'social':    renderSocial(); break;
    case 'smarthome': renderSmartHome(); break;
    case 'business':  renderBusiness(); break;
  }
}

// ════════════════════════════════════════════════════════
//  1. MENTAL IMAGERY
// ════════════════════════════════════════════════════════
const MI_SCRIPTS = {
  ocean_calm:['Close your eyes. Take a deep breath in... and slowly release.','You are standing at the edge of a vast, calm ocean at golden hour. Feel the warm sand between your toes.','A gentle wave rolls in, just touching your feet. The water is perfectly warm — like a bath.','Hear the rhythm: the slow crash, the soft retreat, the silence, and again.','The horizon glows amber and rose. You are completely safe. Completely at peace.','With each breath, feel yourself becoming calmer. Each exhale releases tension.','You are as vast and deep as this ocean. Boundless. Peaceful. Powerful.','Carry this feeling with you. Open your eyes when you are ready.'],
  mountain:['You are at the base of a magnificent mountain. The air is crisp and clean.','With each step upward, your mind becomes clearer. Leave every worry on the trail below.','Halfway up, you pause. See the world spread below you — cities, rivers, forests.','You continue. The peak is near. The air is thin but exhilarating.','You reach the summit. You are standing at the top of the world.','From here, every problem looks small. Every challenge is conquerable.','Breathe in the pure mountain air. You have the strength to face anything.','Descend with clarity. You carry the mountain\'s power within you.'],
  memory_palace:['Imagine a place you know perfectly — your childhood home, a school, a building.','Walk through the front entrance. Notice every detail: the light, the smell, the texture.','Each room in this palace is a vault. Place what you wish to remember in specific spots.','In the living room, place the first item. Give it an unusual, vivid image — make it absurd.','Walk to the kitchen. Place the next item on the counter. See it clearly, in 3D, in color.','Your brain remembers stories and places better than lists. This palace is your superpower.','Walk through your palace again. Each room triggers its memory automatically.','You now have a memory palace. Return here whenever you need to store or retrieve.'],
  creative:['You are entering your creative mind. This space has no rules, no limits, no judgments.','Imagine a blank canvas as large as a wall. What color calls to you first?','Let shapes and forms appear without forcing them. Your subconscious is the artist.','Hear music that doesn\'t exist yet — your own private symphony.','A figure forms in the mist. This is your creative self, the part that knows no boundaries.','Ask it one question: what do you want to create? Listen. The answer will come.','Your creativity is not blocked. It is simply waiting for your permission.','Open your eyes. The canvas is ready. You are ready.'],
  cosmic:['You are floating in space. Below you, the Earth — a blue marble, glowing softly.','The silence is absolute. The beauty is infinite. You are weightless and free.','Stars surround you in every direction. Each one a sun with worlds of its own.','You are made of stardust — the same atoms that forged galaxies billions of years ago.','Zoom out. The solar system becomes a speck. The galaxy a river of light.','You are both infinitely small and infinitely connected. You are part of everything.','The universe is 13.8 billion years old. You are here, right now, aware. That is extraordinary.','Return gently. Bring back the perspective of the cosmos.'],
  forest:['You are walking into an ancient forest. Sunlight filters through the canopy above.','The ground is soft with moss. Each step is cushioned, silent, slow.','Trees tower around you — centuries old, patient, deeply rooted.','Touch the bark of a great oak. Feel its rough texture. This tree has lived through history.','A stream appears, crystal clear. Sit beside it. Watch the water move over smooth stones.','Breathe in the scent of pine, earth, and rain. Your nervous system is healing right now.','In this forest, you are held by nature. You belong here. You always have.','Take three deep breaths. Fill your lungs with forest air. Carry its healing with you.'],
  performance:['You are backstage. In moments, you will step onto the stage of your peak performance.','Visualize the scene in perfect detail. See exactly what success looks like.','Feel your body — strong, capable, precisely prepared. Every muscle knows what to do.','See yourself executing perfectly. Every move, every word, every decision — flawless.','The crowd, the challenge, the pressure — you welcome it. Pressure creates diamonds.','See the moment of triumph. Feel it completely — the surge of pride and accomplishment.','This vision is a rehearsal. Your brain cannot distinguish imagination from reality.','You have already succeeded in your mind. Now go make it real.'],
  problem_solve:['Bring your unsolved problem into the space before you. Give it a shape, a color, a texture.','Look at it from above. From the side. From behind. See it from every angle.','What if the opposite approach were true? What would that look like?','Shrink the problem to the size of a marble. Hold it in your palm. It is manageable.','Ask your subconscious: what is the simplest solution? Breathe. Wait. Listen.','The answer exists. Your mind has all the pieces. You are assembling them now.','A door appears. On the other side is the solution, fully formed.','Open the door. Step through. You have your answer.'],
};
const MI_CATS = [
  ['🌊 Ocean Calm','ocean_calm'],['🏔 Mountain Peak','mountain'],
  ['🧠 Memory Palace','memory_palace'],['✨ Creative Vision','creative'],
  ['🌌 Cosmic Journey','cosmic'],['🌿 Forest Healing','forest'],
  ['🔥 Peak Performance','performance'],['💡 Problem Solving','problem_solve'],
];

function renderMentalImagery() {
  const btns = MI_CATS.map(c=>`<button class="bp-btn" onclick="startMI('${c[1]}','${c[0]}')">${c[0]}</button>`).join('');
  showBrainPanel(`
    <div class="bp-title">🧠 MENTAL IMAGERY ENGINE</div>
    <div class="bp-text">HENRY guides you through vivid mental visualizations.\nSelect a journey to begin.</div>
    <div class="bp-btn-row" style="flex-direction:column">${btns}</div>
  `);
}

let miScript=[], miStep=0, miPaused=false, miTimer=null;
function startMI(key,title) {
  miScript=MI_SCRIPTS[key]||[]; miStep=0; miPaused=false;
  if(miTimer) clearTimeout(miTimer);
  showBrainPanel(`
    <div class="bp-title">🧠 ${title.toUpperCase()}</div>
    <div class="bp-progress"><div class="bp-progress-bar" id="mi-bar"></div></div>
    <div class="bp-output" id="mi-text">Starting…</div>
    <div class="bp-btn-row">
      <button class="bp-btn" id="mi-pause" onclick="toggleMIPause()">⏸ PAUSE</button>
      <button class="bp-btn" onclick="advanceMI()">⏭ NEXT</button>
      <button class="bp-btn danger" onclick="renderMentalImagery()">✕ STOP</button>
    </div>
  `);
  advanceMI();
}
function advanceMI() {
  if(miStep>=miScript.length){
    document.getElementById('mi-text').textContent='✓ Visualization complete. Take a moment to return.';
    brainSpeak('Visualization complete. Take a moment to return fully to the present.');
    setTimeout(renderMentalImagery,6000); return;
  }
  const line=miScript[miStep];
  const txt=document.getElementById('mi-text');
  const bar=document.getElementById('mi-bar');
  if(txt) txt.textContent=line;
  if(bar) bar.style.width=((miStep+1)/miScript.length*100)+'%';
  brainSpeak(line);
  miStep++;
  if(!miPaused) {
    const delay=Math.max(5000,line.split(' ').length*420);
    miTimer=setTimeout(advanceMI,delay);
  }
}
function toggleMIPause() {
  miPaused=!miPaused;
  const b=document.getElementById('mi-pause');
  if(b) b.textContent=miPaused?'▶ RESUME':'⏸ PAUSE';
  if(!miPaused) advanceMI();
}

// ════════════════════════════════════════════════════════
//  2. DEFAULT MODE NETWORK
// ════════════════════════════════════════════════════════
const DMN_WANDER=[
  'Let your mind go completely blank. Don\'t try to think. Just… drift.',
  'A thought floats by like a cloud. You don\'t hold it. You just watch it pass.',
  'Where does your mind naturally go when no one is asking anything of you?',
  'Imagine a version of yourself from 10 years in the future. What are they doing right now?',
  'If you had no obligations today, where would your mind wander first?',
  'Think of someone you love. What small detail about them makes you smile?',
  'A memory surfaces — unexpected, vivid. Let it play out completely.',
  'What unfinished thought has been quietly sitting in the background of your mind?',
  'Imagine a place that doesn\'t exist but feels completely real to you.',
  'What question do you keep asking yourself that you haven\'t answered yet?',
];
const DMN_REFLECT=[
  'What was the most meaningful moment of this week? Describe it in detail.',
  'What belief have you held that has recently started to shift?',
  'Who has influenced who you are today, and how?',
  'What would your younger self think of who you are now?',
  'What are you tolerating in your life that you no longer need to?',
  'If you were brutally honest with yourself: what do you actually want?',
  'What pattern in your life keeps repeating? What is it trying to teach you?',
  'Name three things you are genuinely proud of — not for others, but for yourself.',
  'What would you do differently if no one were watching or judging?',
  'What does \'success\' actually mean to you, in your own definition?',
];
const DMN_INCUBATE=[
  'Describe your unsolved problem in one sentence. Then let it go completely.',
  'What is the most creative solution you\'ve rejected because it seemed too strange?',
  'If the problem solved itself while you slept, what would be different tomorrow morning?',
  'What approach are you NOT taking that might actually work?',
  'Imagine your best friend has the same problem. What would you tell them?',
];

function renderDMN() {
  showBrainPanel(`
    <div class="bp-title">🌊 DEFAULT MODE NETWORK</div>
    <div class="bp-text">The DMN is your brain's most powerful network.\nIt activates during reflection, daydreaming, creativity, and self-understanding.</div>
    <div class="bp-btn-row" style="flex-direction:column">
      <button class="bp-btn accent-purple" onclick="startDMN('wander')">🌊 Mind-Wandering Session</button>
      <button class="bp-btn accent-purple" onclick="startDMN('reflect')">📖 Reflection Journal</button>
      <button class="bp-btn accent-purple" onclick="startDMN('incubate')">💡 Creative Incubation</button>
      <button class="bp-btn accent-purple" onclick="startDMN('future')">🔮 Future Self Simulation</button>
      <button class="bp-btn accent-purple" onclick="startDMN('empathy')">🤝 Empathy Expansion</button>
      <button class="bp-btn accent-purple" onclick="showDMNJournal()">📔 My DMN Journal</button>
    </div>
  `);
}

let dmnTimer=null, dmnIdx=0, dmnList=[];
function startDMN(mode) {
  if(dmnTimer) clearTimeout(dmnTimer);
  window.speechSynthesis&&window.speechSynthesis.cancel();

  if(mode==='wander') {
    dmnList=[...DMN_WANDER].sort(()=>Math.random()-.5);
    dmnIdx=0;
    showBrainPanel(`
      <div class="bp-title">🌊 MIND-WANDERING</div>
      <div class="bp-output purple" id="dmn-prompt">Preparing session…</div>
      <div class="bp-btn-row">
        <button class="bp-btn accent-purple" onclick="stopDMN()">✕ END SESSION</button>
      </div>
      <div class="bp-text" style="margin-top:.5rem">When the session ends, capture your insights:</div>
      <textarea class="bp-textarea" id="dmn-insight" placeholder="Capture any insights that emerged…"></textarea>
      <button class="bp-btn accent-purple" style="margin-top:.4rem" onclick="saveDMNEntry('Mind-Wandering',document.getElementById('dmn-insight').value)">💾 SAVE INSIGHT</button>
    `);
    runDMNWander();
  } else if(mode==='reflect') {
    const prompt=DMN_REFLECT[Math.floor(Math.random()*DMN_REFLECT.length)];
    brainSpeak(prompt);
    showBrainPanel(`
      <div class="bp-title">📖 REFLECTION MODE</div>
      <div class="bp-output purple" id="dmn-prompt">${prompt}</div>
      <textarea class="bp-textarea" id="dmn-text" placeholder="Write your reflection…"></textarea>
      <div class="bp-btn-row" style="margin-top:.5rem">
        <button class="bp-btn accent-purple" onclick="deepenWithHenry('${prompt.replace(/'/g,"\\'")}')">◈ DEEPEN WITH HENRY</button>
        <button class="bp-btn" onclick="saveDMNEntry('Reflection',document.getElementById('dmn-text').value)">💾 SAVE</button>
      </div>
      <div class="bp-output purple" id="dmn-ai-out" style="display:none"></div>
    `);
  } else if(mode==='incubate') {
    showBrainPanel(`
      <div class="bp-title">💡 CREATIVE INCUBATION</div>
      <div class="bp-output purple">State your unsolved challenge. Then your subconscious will work on it while you rest.</div>
      <textarea class="bp-textarea" id="dmn-challenge" placeholder="State your challenge in one clear sentence…"></textarea>
      <button class="bp-btn accent-purple" style="margin-top:.5rem" onclick="beginIncubation()">◈ BEGIN INCUBATION</button>
      <div class="bp-output purple" id="dmn-incubate-out" style="margin-top:.5rem;display:none"></div>
    `);
  } else if(mode==='future') {
    showBrainPanel(`
      <div class="bp-title">🔮 FUTURE SELF SIMULATION</div>
      <div class="bp-output purple">Imagine your ideal self exactly 5 years from now.\n\n• Where are you living?\n• What are you working on?\n• How do you feel when you wake up?\n• Who is around you?\n• What did it take to get here?</div>
      <textarea class="bp-textarea" id="dmn-future" placeholder="Describe your future self's life…"></textarea>
      <button class="bp-btn accent-purple" style="margin-top:.5rem" onclick="analyseWithHenry('future')">◈ HENRY ANALYSES YOUR FUTURE</button>
      <div class="bp-output purple" id="dmn-ai-out" style="margin-top:.5rem;display:none"></div>
    `);
    brainSpeak('Imagine your ideal self five years from now. Describe your life in detail.');
  } else if(mode==='empathy') {
    const scenarios=[
      'Think of someone who frustrates you. Describe their life from THEIR perspective — their fears, pressures, what they need.',
      'Imagine being a refugee arriving in a new country with nothing but a phone and one bag. What is your first hour like?',
      'You are 85 years old, looking back at your life. What do you wish you had done more of?',
      'Think of someone very different from you politically or culturally. What do you both want at the deepest level?',
    ];
    const s=scenarios[Math.floor(Math.random()*scenarios.length)];
    brainSpeak(s);
    showBrainPanel(`
      <div class="bp-title">🤝 EMPATHY EXPANSION</div>
      <div class="bp-output purple">${s}</div>
      <textarea class="bp-textarea" id="dmn-empathy" placeholder="Write from their perspective…"></textarea>
      <button class="bp-btn accent-purple" style="margin-top:.5rem" onclick="reflectEmpathy('${s.replace(/'/g,"\\'")}')">◈ REFLECT WITH HENRY</button>
      <div class="bp-output purple" id="dmn-ai-out" style="margin-top:.5rem;display:none"></div>
    `);
  }
}

function runDMNWander() {
  if(dmnIdx>=dmnList.length) {
    const el=document.getElementById('dmn-prompt');
    if(el) el.textContent='Session complete. Your DMN has been fully activated. Capture any insights below.';
    return;
  }
  const prompt=dmnList[dmnIdx++];
  const el=document.getElementById('dmn-prompt');
  if(el) el.textContent=prompt;
  brainSpeak(prompt);
  const delay=Math.max(12000,prompt.split(' ').length*600);
  dmnTimer=setTimeout(runDMNWander,delay);
}
function stopDMN(){if(dmnTimer)clearTimeout(dmnTimer);window.speechSynthesis&&window.speechSynthesis.cancel();}

async function deepenWithHenry(prompt) {
  const text=(document.getElementById('dmn-text')||{}).value||'';
  if(!text.trim()) return;
  const out=document.getElementById('dmn-ai-out');
  if(out){out.style.display='';out.textContent='Analysing your reflection…';}
  const aiPrompt=`Reflection prompt: "${prompt}"\n\nUser wrote: "${text}"\n\nOffer 2-3 deep, insightful follow-up questions to help them go deeper into self-understanding. Be warm, perceptive, genuinely curious.`;
  const reply=await askHenryBrain(aiPrompt);
  if(out) out.textContent=reply;
  brainSpeak(reply);
}
async function analyseWithHenry(type) {
  const ta=document.getElementById(type==='future'?'dmn-future':'dmn-empathy')||{};
  const text=ta.value||'';
  if(!text.trim()) return;
  const out=document.getElementById('dmn-ai-out');
  if(out){out.style.display='';out.textContent='Thinking…';}
  const aiPrompt=type==='future'
    ?`My 5-year vision: "${text}"\n\nIdentify: (1) the biggest gap between now and this vision, (2) the first concrete step this week, (3) one hidden limiting belief. Be direct, warm, honest.`
    :text;
  const reply=await askHenryBrain(aiPrompt);
  if(out) out.textContent=reply;
  brainSpeak(reply);
  saveDMNEntry(type==='future'?'Future Self':'Empathy', text+'\n\nHENRY: '+reply);
}
async function reflectEmpathy(scenario) {
  const text=(document.getElementById('dmn-empathy')||{}).value||'';
  if(!text.trim()) return;
  const out=document.getElementById('dmn-ai-out');
  if(out){out.style.display='';out.textContent='Expanding empathy…';}
  const aiPrompt=`Empathy exercise. Scenario: "${scenario}"\n\nUser wrote: "${text}"\n\nOffer a compassionate reflection: what they did well, what deeper insight they missed, one question to go further.`;
  const reply=await askHenryBrain(aiPrompt);
  if(out) out.textContent=reply;
  brainSpeak(reply);
}
async function beginIncubation() {
  const challenge=(document.getElementById('dmn-challenge')||{}).value||'';
  if(!challenge.trim()) return;
  const iPrompt=DMN_INCUBATE[Math.floor(Math.random()*DMN_INCUBATE.length)];
  const out=document.getElementById('dmn-incubate-out');
  if(out){out.style.display='';out.textContent=`Challenge logged: "${challenge}"\n\n${iPrompt}\n\nNow — don't think about it. Let your subconscious work.`;}
  brainSpeak(`Challenge logged. ${iPrompt} Now let it go. Your subconscious will work on it.`);
  saveDMNEntry('Incubation: '+challenge, iPrompt);
}
function saveDMNEntry(heading, content) {
  if(!content||!content.trim()) return;
  const ts=new Date().toLocaleString();
  const existing=localStorage.getItem('henry_dmn_journal')||'';
  const entry=`─────────────────────\n[${ts}]\n${heading}\n\n${content}\n\n`;
  localStorage.setItem('henry_dmn_journal',entry+existing);
  alert('Saved to DMN Journal ✓');
}
function showDMNJournal() {
  const raw=localStorage.getItem('henry_dmn_journal')||'No entries yet.\n\nComplete a DMN session and save your reflections.';
  showBrainPanel(`
    <div class="bp-title">📔 DMN JOURNAL</div>
    <div class="bp-output purple" style="max-height:400px;overflow-y:auto;white-space:pre-wrap">${raw}</div>
    <button class="bp-btn danger" style="margin-top:.5rem" onclick="if(confirm('Clear all DMN journal entries?')){localStorage.removeItem('henry_dmn_journal');renderDMN();}">🗑 CLEAR JOURNAL</button>
  `);
}

// ════════════════════════════════════════════════════════
//  3. NEURAL PLASTICITY
// ════════════════════════════════════════════════════════
function renderPlasticity() {
  showBrainPanel(`
    <div class="bp-title">⚡ NEURAL PLASTICITY</div>
    <div class="bp-score" id="np-stats">◈ SCORE: ${brainScore} &nbsp; 🔥 STREAK: ${brainStreak}</div>
    <div class="bp-text">Daily exercises that build new neural pathways.</div>
    <div class="bp-btn-row" style="flex-direction:column">
      <button class="bp-btn accent-green" onclick="startNP('memory')">🧮 Working Memory</button>
      <button class="bp-btn accent-green" onclick="startNP('flip')">🔄 Cognitive Flip</button>
      <button class="bp-btn accent-green" onclick="startNP('divergent')">💡 Divergent Thinking</button>
      <button class="bp-btn accent-green" onclick="startNP('dual')">🎯 Dual Task</button>
      <button class="bp-btn accent-green" onclick="startNP('numbers')">🔢 Number Sense</button>
      <button class="bp-btn accent-green" onclick="startNP('pattern')">🧩 Pattern Break</button>
      <button class="bp-btn accent-green" onclick="startNP('word_rev')">🔤 Word Reversal</button>
      <button class="bp-btn accent-green" onclick="startNP('stroop')">🔵 Stroop Challenge</button>
    </div>
  `);
}

let npExIdx=0, npMode='', npCorrect='';
function startNP(mode) {
  npMode=mode; npExIdx=0; npCorrect='';
  nextNP();
}
function nextNP() {
  npExIdx++;
  const html=buildNPExercise(npMode,npExIdx);
  showBrainPanel(`
    <div class="bp-title">⚡ NEURAL PLASTICITY</div>
    <div class="bp-score" id="np-stats">◈ SCORE: ${brainScore} &nbsp; 🔥 STREAK: ${brainStreak}</div>
    ${html}
    <div class="bp-output accent-green" id="np-feedback" style="display:none"></div>
    <div class="bp-btn-row" style="margin-top:.5rem">
      <button class="bp-btn accent-green" onclick="checkNP()">✓ CHECK</button>
      <button class="bp-btn accent-green" onclick="nextNP()">⏭ NEXT</button>
      <button class="bp-btn danger" onclick="renderPlasticity()">← BACK</button>
    </div>
  `);
}
function buildNPExercise(mode,idx) {
  const rnd=n=>Math.floor(Math.random()*n);
  let title='', challenge='', inputHtml='';

  if(mode==='memory') {
    const nums=Array.from({length:5},()=>rnd(9)+1);
    const sum=nums.reduce((a,b)=>a+b,0);
    npCorrect=String(sum);
    title='🧮 WORKING MEMORY';
    challenge=`Remember this sequence:\n\n${nums.join('  ')}\n\nYou have 3 seconds, then the numbers disappear.\nWhat is their SUM?`;
    const hidden=`<div id="np-nums" style="font-size:1.6rem;color:#00ff99;text-align:center;padding:.5rem;letter-spacing:.3em">${nums.join(' ')}</div>`;
    setTimeout(()=>{const el=document.getElementById('np-nums');if(el)el.style.visibility='hidden';},3000);
    inputHtml=hidden+`<input class="bp-textarea" id="np-ans" type="number" placeholder="Enter the sum…" style="margin-top:.5rem">`;
  } else if(mode==='flip') {
    const flips=[
      ['Count from 100 DOWN by 7s. First 4 steps: 100, 93, 86, 79… what comes next?','72'],
      ['What is 15 × 8 − 40?','80'],
      ['Spell the word "WEDNESDAY" backwards.','YADSENDEW'],
      ['What is the 7th letter of the alphabet?','G'],
    ];
    const q=flips[idx%flips.length];
    npCorrect=q[1].toLowerCase();
    title='🔄 COGNITIVE FLIP'; challenge=q[0];
    inputHtml=`<input class="bp-textarea" id="np-ans" placeholder="Your answer…" style="margin-top:.5rem">`;
  } else if(mode==='divergent') {
    const prompts=['Name 5 uses for a BRICK other than building.','What do a CLOCK and a RIVER have in common?','Invent a word for feeling happy AND sad simultaneously.','If you could add one sense to humans, what would it detect?'];
    npCorrect='describe';
    title='💡 DIVERGENT THINKING'; challenge=prompts[idx%prompts.length];
    inputHtml=`<textarea class="bp-textarea" id="np-ans" placeholder="Write your creative answer…" style="margin-top:.5rem"></textarea>`;
  } else if(mode==='dual') {
    const tasks=[['While TAPPING your left knee rhythmically, solve this: 7 × 8 = ?','56'],['While HUMMING any tune, count the vowels in: "The quick brown fox jumps"','8'],['While BLINKING slowly every 2 seconds, what is 144 ÷ 12?','12']];
    const t=tasks[idx%tasks.length];
    npCorrect=t[1]; title='🎯 DUAL TASK'; challenge=t[0]+'\n\n⚠ Do BOTH simultaneously — that\'s the point.';
    inputHtml=`<input class="bp-textarea" id="np-ans" placeholder="Answer…" style="margin-top:.5rem">`;
  } else if(mode==='numbers') {
    const type=rnd(3);
    let q,ans;
    if(type===0){const a=rnd(50)+10,b=rnd(50)+10;q=`${a} × ${b} = ? (mental math only)`;ans=a*b;}
    else if(type===1){const a=rnd(900)+100,b=rnd(9)+2;q=`${a} ÷ ${b} ≈ ? (round to nearest whole)`;ans=Math.round(a/b);}
    else{const a=rnd(200)+50,b=rnd(200)+50;q=`${a} + ${b} = ? (no writing)`;ans=a+b;}
    npCorrect=String(ans); title='🔢 NUMBER SENSE'; challenge=q;
    inputHtml=`<input class="bp-textarea" id="np-ans" type="number" placeholder="Your answer…" style="margin-top:.5rem">`;
  } else if(mode==='pattern') {
    const patterns=[['2, 4, 8, 16, 32, __ ?','64'],['Z, Y, X, W, __ ?','V'],['1, 1, 2, 3, 5, 8, __ ?','13'],['Monday, Wednesday, Friday, __ ?','Sunday'],['🔴, 🔵, 🟡, 🔴, 🔵, __ ?','🟡']];
    const p=patterns[idx%patterns.length];
    npCorrect=p[1].toLowerCase(); title='🧩 PATTERN BREAK'; challenge=`Complete the pattern:\n\n${p[0]}`;
    inputHtml=`<input class="bp-textarea" id="np-ans" placeholder="Next in sequence…" style="margin-top:.5rem">`;
  } else if(mode==='word_rev') {
    const words=[['Spell ELEPHANT backwards','TNAHPELE'],['What does DESSERTS spell backwards?','STRESSED'],['Reverse: "I love you"','you love I']];
    const w=words[idx%words.length];
    npCorrect=w[1].toLowerCase(); title='🔤 WORD REVERSAL'; challenge=w[0];
    inputHtml=`<input class="bp-textarea" id="np-ans" placeholder="Reversed…" style="margin-top:.5rem">`;
  } else if(mode==='stroop') {
    const words=['RED','BLUE','GREEN','YELLOW'];
    const colors=['#FF3333','#3399FF','#00CC66','#FFDD00'];
    const names=['RED','BLUE','GREEN','YELLOW'];
    let wi=rnd(4),ci=rnd(4);
    while(ci===wi) ci=rnd(4);
    npCorrect=names[ci].toLowerCase();
    title='🔵 STROOP CHALLENGE';
    challenge='What COLOR is this text printed in?\n(Not the word — the COLOR of the ink)';
    inputHtml=`<div class="stroop-word" style="color:${colors[ci]}">${words[wi]}</div>
      <div class="bp-btn-row">${names.map(n=>`<button class="bp-btn" onclick="checkNPDirect('${n.toLowerCase()}')">${n}</button>`).join('')}</div>`;
  }

  return `<div class="bp-title" style="margin-bottom:.4rem">${title}</div>
    <div class="bp-output accent-green">${challenge}</div>
    ${inputHtml}`;
}
function checkNP() {
  const el=document.getElementById('np-ans');
  const ans=(el?el.value:'').trim().toLowerCase();
  checkNPDirect(ans);
}
function checkNPDirect(ans) {
  const correct=npCorrect==='describe'||ans===npCorrect;
  const fb=document.getElementById('np-feedback');
  if(correct){
    brainScore+=10; brainStreak++;
    if(fb){fb.style.display='';fb.style.color='#00ff99';fb.textContent=`✓ Excellent! Neural pathway reinforced. +10`;}
    brainSpeak('Correct! Neural pathway reinforced.');
  } else {
    brainStreak=0;
    if(fb){fb.style.display='';fb.style.color='#ff4444';fb.textContent=`✗ Answer: ${npCorrect}\nNew pathway forming — that's the point.`;}
  }
  localStorage.setItem('henry_brain_score',brainScore);
  localStorage.setItem('henry_brain_streak',brainStreak);
  const stats=document.getElementById('np-stats');
  if(stats) stats.textContent=`◈ SCORE: ${brainScore}   🔥 STREAK: ${brainStreak}`;
  const check=document.querySelector('.bp-btn.accent-green');
  // disable inputs
  const inp=document.getElementById('np-ans');
  if(inp) inp.disabled=true;
}

// ════════════════════════════════════════════════════════
//  4. SENSORY ENGINE
// ════════════════════════════════════════════════════════
const COLOR_FREQS=[{name:'Red',freq:440,color:'#FF3333'},{name:'Orange',freq:528,color:'#FF9944'},{name:'Yellow',freq:639,color:'#FFDD00'},{name:'Green',freq:741,color:'#00CC66'},{name:'Blue',freq:852,color:'#00AAFF'},{name:'Violet',freq:963,color:'#CC88FF'}];
const COLOR_MEANINGS={Red:'Passion, urgency, energy',Orange:'Warmth, creativity, adventure',Yellow:'Joy, clarity, optimism',Green:'Balance, growth, healing',Blue:'Calm, depth, wisdom',Violet:'Intuition, mystery, transformation'};

function renderSensory() {
  showBrainPanel(`
    <div class="bp-title">🎵 SENSORY SUBSTITUTION ENGINE</div>
    <div class="bp-text">Experience the world through different senses.\nHENRY translates between modalities.</div>
    <div class="bp-btn-row" style="flex-direction:column">
      <button class="bp-btn accent-orange" onclick="startSensory('color_sound')">🎵 Color → Sound (Synesthesia)</button>
      <button class="bp-btn accent-orange" onclick="startSensory('text_touch')">✋ Text → Morse Rhythm</button>
      <button class="bp-btn accent-orange" onclick="startSensory('describe')">🌍 Describe Scene via AI</button>
      <button class="bp-btn accent-orange" onclick="startSensory('braille')">🔤 Braille Light Patterns</button>
    </div>
  `);
}
function startSensory(mode) {
  if(mode==='color_sound') {
    const btns=COLOR_FREQS.map(c=>`<button class="bp-btn" style="background:${c.color};color:#000;border-color:${c.color}" onclick="playColorTone(${c.freq},'${c.name}')">${c.name} — ${c.freq} Hz</button>`).join('');
    showBrainPanel(`
      <div class="bp-title">🎵 COLOR → SOUND (Synesthesia)</div>
      <div class="bp-text">Each color has its own healing frequency.\nTap a color to hear its tone.</div>
      <div class="bp-btn-row" style="flex-direction:column">${btns}</div>
      <div class="bp-output orange" id="ss-out">Tap a color button above</div>
    `);
  } else if(mode==='text_touch') {
    showBrainPanel(`
      <div class="bp-title">✋ TEXT → MORSE RHYTHM</div>
      <div class="bp-text">Type text and feel it as Morse code flashes.\n(Screen flashes simulate tactile rhythm.)</div>
      <input class="bp-textarea" id="ss-text" placeholder="Type a word or phrase…">
      <button class="bp-btn accent-orange" style="margin-top:.5rem" onclick="playMorse()">▶ PLAY MORSE</button>
      <div class="bp-output orange" id="ss-out" style="margin-top:.5rem">Output will appear here</div>
    `);
  } else if(mode==='describe') {
    showBrainPanel(`
      <div class="bp-title">🌍 DESCRIBE SCENE</div>
      <div class="bp-text">Attach or describe an image and HENRY will analyse it through multiple sensory lenses.</div>
      <input type="file" id="ss-file" accept="image/*" style="color:#00D4FF;margin-bottom:.5rem">
      <button class="bp-btn accent-orange" onclick="describeSceneAI()">◈ ANALYSE WITH HENRY</button>
      <div class="bp-output orange" id="ss-out" style="margin-top:.5rem;display:none"></div>
    `);
  } else if(mode==='braille') {
    const BRAILLE={'a':'⠁','b':'⠃','c':'⠉','d':'⠙','e':'⠑','f':'⠋','g':'⠛','h':'⠓','i':'⠊','j':'⠚','k':'⠅','l':'⠇','m':'⠍','n':'⠝','o':'⠕','p':'⠏','q':'⠟','r':'⠗','s':'⠎','t':'⠞','u':'⠥','v':'⠧','w':'⠺','x':'⠭','y':'⠽','z':'⠵',' ':'  '};
    showBrainPanel(`
      <div class="bp-title">🔤 BRAILLE LIGHT PATTERNS</div>
      <div class="bp-text">Type text and see it converted to Braille Unicode.\nEach character becomes a tactile dot pattern.</div>
      <input class="bp-textarea" id="ss-braille-in" placeholder="Type text to convert…">
      <button class="bp-btn accent-orange" style="margin-top:.5rem" onclick="convertBraille()">◈ CONVERT</button>
      <div class="bp-output orange" id="ss-out" style="margin-top:.5rem;font-size:1.4rem;letter-spacing:.15em"></div>
    `);
    window._BRAILLE=BRAILLE;
  }
}
function playColorTone(freq,name) {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value=freq; osc.type='sine';
    gain.gain.setValueAtTime(0.3,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+1.2);
    osc.start(); osc.stop(ctx.currentTime+1.2);
    const out=document.getElementById('ss-out');
    if(out) out.textContent=`🎵 ${name} → ${freq} Hz\n"${COLOR_MEANINGS[name]||''}"`;
    brainSpeak(`${name}: ${freq} hertz. ${COLOR_MEANINGS[name]||''}`);
  } catch(e){}
}
function playMorse() {
  const text=(document.getElementById('ss-text')||{}).value||'';
  const MORSE={'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---','K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-','U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..',' ':' '};
  const morse=text.toUpperCase().split('').map(c=>MORSE[c]||'').join(' ');
  const out=document.getElementById('ss-out');
  if(out) out.textContent=morse||'?';
  // Flash screen for dots/dashes
  let i=0;
  const chars=morse.split('');
  function flash() {
    if(i>=chars.length) return;
    const c=chars[i++];
    const dur=c==='.'?100:c==='-'?300:200;
    document.body.style.backgroundColor=c===' '?'':(c==='.'?'#003333':'#005555');
    setTimeout(()=>{document.body.style.backgroundColor='';setTimeout(flash,80);},dur);
  }
  flash();
}
async function describeSceneAI() {
  const file=(document.getElementById('ss-file')||{}).files;
  const out=document.getElementById('ss-out');
  if(!file||!file.length){if(out){out.style.display='';out.textContent='Please select an image first.';}return;}
  if(out){out.style.display='';out.textContent='Analysing scene…';}
  const reader=new FileReader();
  reader.onload=async e=>{
    const b64=e.target.result.split(',')[1];
    const prompt='Describe this scene through multiple sensory lenses: what sounds might be present, what it might smell like, what textures exist, what emotions the scene evokes, and any hidden details. Be vivid and poetic.';
    const reply=await askHenryBrainImage(prompt,b64);
    if(out) out.textContent=reply;
    brainSpeak(reply.substring(0,300));
  };
  reader.readAsDataURL(file[0]);
}
function convertBraille() {
  const text=(document.getElementById('ss-braille-in')||{}).value||'';
  const B=window._BRAILLE||{};
  const result=text.toLowerCase().split('').map(c=>B[c]||c).join('');
  const out=document.getElementById('ss-out');
  if(out) out.textContent=result;
}

// ════════════════════════════════════════════════════════
//  5. MEMORY BANKS (localStorage-backed)
// ════════════════════════════════════════════════════════
function renderMemoryBanks() {
  refreshMemoryBanks();
}
function refreshMemoryBanks() {
  const facts=JSON.parse(localStorage.getItem('henry_memory_facts')||'[]');
  const items=facts.length
    ? facts.map((f,i)=>`<div class="bp-memory-item"><span>◈ ${f}</span><button class="bp-memory-del" onclick="deleteMemoryFact(${i})">✕</button></div>`).join('')
    : '<div style="color:#2a6a8a;font-size:.82rem;padding:.5rem 0">No memories yet. Converse with HENRY and he will learn about you.</div>';
  showBrainPanel(`
    <div class="bp-title">💾 MEMORY BANKS</div>
    <div id="mem-list">${items}</div>
    <div style="display:flex;gap:.5rem;margin-top:.75rem">
      <input class="bp-textarea" id="mem-new" placeholder="Add a memory fact…" style="flex:1;min-height:auto;padding:.4rem .7rem">
      <button class="bp-btn" onclick="addMemoryFact()">+ ADD</button>
    </div>
    <button class="bp-btn danger" style="margin-top:.5rem" onclick="if(confirm('Clear all memories?')){localStorage.removeItem('henry_memory_facts');refreshMemoryBanks();}">🗑 CLEAR ALL</button>
  `);
}
function addMemoryFact() {
  const el=document.getElementById('mem-new');
  const fact=(el?el.value:'').trim();
  if(!fact) return;
  const facts=JSON.parse(localStorage.getItem('henry_memory_facts')||'[]');
  facts.unshift(fact);
  localStorage.setItem('henry_memory_facts',JSON.stringify(facts));
  refreshMemoryBanks();
}
function deleteMemoryFact(idx) {
  const facts=JSON.parse(localStorage.getItem('henry_memory_facts')||'[]');
  facts.splice(idx,1);
  localStorage.setItem('henry_memory_facts',JSON.stringify(facts));
  refreshMemoryBanks();
}

// ════════════════════════════════════════════════════════
//  6. GOOGLE WORKSPACE
// ════════════════════════════════════════════════════════
function renderWorkspace() {
  showBrainPanel(`
    <div class="bp-title">📄 GOOGLE WORKSPACE</div>
    <div class="bp-text">Create Google Docs, Sheets, or Slides via HENRY.\nJust describe what you want — HENRY will create it.</div>
    <div class="bp-btn-row" style="flex-direction:column">
      <button class="bp-btn" onclick="createDoc('doc')">📝 Create Google Doc</button>
      <button class="bp-btn" onclick="createDoc('sheet')">📊 Create Google Sheet</button>
      <button class="bp-btn" onclick="createDoc('slide')">📑 Create Google Slides</button>
    </div>
    <textarea class="bp-textarea" id="ws-desc" placeholder="Describe what you want (e.g. 'Weekly budget tracker with income and expenses')…" style="margin-top:.75rem"></textarea>
    <div class="bp-output" id="ws-out" style="margin-top:.5rem;display:none"></div>
  `);
}
async function createDoc(type) {
  const desc=(document.getElementById('ws-desc')||{}).value||'';
  const out=document.getElementById('ws-out');
  if(out){out.style.display='';out.textContent=`Creating Google ${type}…`;}
  const prompt=`Create a new Google ${type==='doc'?'Document':type==='sheet'?'Spreadsheet':'Presentation'}${desc?` for: "${desc}"`:' — blank template'}. Provide the Google ${type==='doc'?'Docs':type==='sheet'?'Sheets':'Slides'} link. If you cannot create it directly, give me the exact URL to create it manually.`;
  const reply=await askHenryBrain(prompt);
  if(out) out.textContent=reply;
  // Extract and open any URLs
  const urls=reply.match(/https?:\/\/[^\s]+/g);
  if(urls&&urls.length) window.open(urls[0],'_blank');
}

// ════════════════════════════════════════════════════════
//  7. VISION SCANNER
// ════════════════════════════════════════════════════════
function renderVision() {
  showBrainPanel(`
    <div class="bp-title">👁 VISION SCANNER</div>
    <div class="bp-text">Upload an image for AI-powered analysis:\nObject detection, scene description, text extraction, face emotion reading, and more.</div>
    <input type="file" id="vision-file" accept="image/*" style="color:#00D4FF;margin-bottom:.5rem" onchange="previewVision(this)">
    <canvas id="brain-vision-canvas"></canvas>
    <div class="bp-btn-row">
      <button class="bp-btn" onclick="runVision('describe')">🔍 Describe Scene</button>
      <button class="bp-btn" onclick="runVision('objects')">📦 Detect Objects</button>
      <button class="bp-btn" onclick="runVision('text')">🔤 Extract Text</button>
      <button class="bp-btn" onclick="runVision('emotion')">😊 Read Emotions</button>
      <button class="bp-btn" onclick="runVision('animal')">🐾 Identify Species</button>
    </div>
    <div class="bp-output" id="vision-out" style="margin-top:.5rem;display:none"></div>
  `);
}
function previewVision(inp) {
  const file=inp.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const canvas=document.getElementById('brain-vision-canvas');
    if(!canvas) return;
    const img=new Image();
    img.onload=()=>{
      const maxW=canvas.parentElement.clientWidth||400;
      const scale=Math.min(1,maxW/img.width,240/img.height);
      canvas.width=img.width*scale; canvas.height=img.height*scale;
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
async function runVision(type) {
  const file=(document.getElementById('vision-file')||{}).files;
  const out=document.getElementById('vision-out');
  if(!file||!file.length){if(out){out.style.display='';out.textContent='Please select an image first.';}return;}
  if(out){out.style.display='';out.textContent='Analysing…';}
  const reader=new FileReader();
  reader.onload=async e=>{
    const b64=e.target.result.split(',')[1];
    const prompts={
      describe:'Describe this image in vivid detail — scene, objects, colors, lighting, mood, and any text visible.',
      objects:'List all objects you can detect in this image with confidence levels. Format as a structured list.',
      text:'Extract ALL text visible in this image exactly as written. If no text, say so.',
      emotion:'Analyse the emotions, expressions, and body language of any people in this image. If no people, describe the emotional mood of the scene.',
      animal:'Identify any animals or species in this image. Provide: species name, habitat, interesting facts, conservation status.',
    };
    const reply=await askHenryBrainImage(prompts[type]||prompts.describe,b64);
    if(out) out.textContent=reply;
    brainSpeak(reply.substring(0,300));
  };
  reader.readAsDataURL(file[0]);
}

// ════════════════════════════════════════════════════════
//  8. SMART MEMORY AI
// ════════════════════════════════════════════════════════
function renderSmartMem() {
  const facts=JSON.parse(localStorage.getItem('henry_memory_facts')||'[]');
  const items=facts.length
    ? facts.map((f,i)=>`<div class="bp-memory-item"><span>◈ ${f}</span><button class="bp-memory-del" onclick="deleteSmartFact(${i})">✕</button></div>`).join('')
    : '<div style="color:#2a6a8a;padding:.5rem 0;font-size:.82rem">HENRY hasn\'t learned anything about you yet.\nConverse with him and he will build your profile automatically.</div>';
  showBrainPanel(`
    <div class="bp-title">🔮 SMART MEMORY AI</div>
    <div class="bp-text">Facts HENRY has auto-learned about you from your conversations.</div>
    <div id="sm-list">${items}</div>
    <div style="display:flex;gap:.5rem;margin-top:.75rem">
      <input class="bp-textarea" id="sm-new" placeholder="Manually add a fact about yourself…" style="flex:1;min-height:auto;padding:.4rem .7rem">
      <button class="bp-btn" onclick="addSmartFact()">+ ADD</button>
    </div>
    <button class="bp-btn danger" style="margin-top:.5rem" onclick="if(confirm('Erase all HENRY memories?')){localStorage.removeItem('henry_memory_facts');renderSmartMem();}">🗑 CLEAR ALL MEMORIES</button>
  `);
}
function addSmartFact() {
  const el=document.getElementById('sm-new');
  const fact=(el?el.value:'').trim();
  if(!fact) return;
  const facts=JSON.parse(localStorage.getItem('henry_memory_facts')||'[]');
  facts.unshift(fact);
  localStorage.setItem('henry_memory_facts',JSON.stringify(facts));
  renderSmartMem();
}
function deleteSmartFact(idx) {
  const facts=JSON.parse(localStorage.getItem('henry_memory_facts')||'[]');
  facts.splice(idx,1);
  localStorage.setItem('henry_memory_facts',JSON.stringify(facts));
  renderSmartMem();
}

// ════════════════════════════════════════════════════════
//  AI helpers — call Vercel backend
// ════════════════════════════════════════════════════════
async function askHenryBrain(prompt) {
  try {
    const res=await fetch('/api/jarvis',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages:[{role:'user',content:prompt}],history:[]})
    });
    const d=await res.json();
    const raw=d.reply||d.message||d.text||'No response.';
    return raw.replace(/\[EMOTION:[^\]]+\]/g,'').trim();
  } catch(e) { return 'HENRY is currently unavailable. Please try again.'; }
}
async function askHenryBrainImage(prompt,base64) {
  try {
    const res=await fetch('/api/jarvis',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages:[{role:'user',content:prompt}],history:[],imageBase64:base64})
    });
    const d=await res.json();
    const raw=d.reply||d.message||d.text||'No response.';
    return raw.replace(/\[EMOTION:[^\]]+\]/g,'').trim();
  } catch(e) { return 'Vision analysis unavailable.'; }
}

// ════════════════════════════════════════════════════════
//  9. DASHBOARD
// ════════════════════════════════════════════════════════
function renderDashboard() {
  const totalChats    = parseInt(localStorage.getItem('henry_total_chats')||'0');
  const imagesGen     = parseInt(localStorage.getItem('henry_images_gen')||'0');
  const facts         = JSON.parse(localStorage.getItem('henry_memory_facts')||'[]');
  const lockEnabled   = localStorage.getItem('henry_lock')==='true';
  const accent        = localStorage.getItem('henry_accent')||'british';
  const days          = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const weekData      = JSON.parse(localStorage.getItem('henry_week_activity')||'[0,0,0,0,0,0,0]');
  const maxD          = Math.max(...weekData, 1);

  const bars = days.map((d,i) => {
    const h = Math.max(4, Math.round(weekData[i]/maxD*80));
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px">
      <div style="width:100%;height:${h}px;background:#00D4FF;border-radius:2px"></div>
      <div style="font-size:.6rem;color:#2a6a8a">${d}</div>
    </div>`;
  }).join('');

  const memItems = facts.slice(0,5).map(f=>`<div style="color:#4a9ab8;font-size:.8rem;padding:3px 0;border-bottom:1px solid #0a2a3a">◈ ${f}</div>`).join('') || '<div style="color:#2a6a8a;font-size:.8rem">No memories yet</div>';

  showBrainPanel(`
    <div class="bp-title">📊 H·E·N·R·Y DASHBOARD</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:.75rem">
      ${[['💬',totalChats,'Chats','#00D4FF'],['💾',facts.length,'Memories','#CC88FF'],['🖼',imagesGen,'Images','#FF9944'],['🎙',parseInt(localStorage.getItem('henry_voice_cmds')||'0'),'Voice','#00FF99']].map(([ic,v,l,c])=>`
        <div style="background:#060f1e;border:1px solid #0a2a3a;border-radius:6px;padding:.6rem;text-align:center">
          <div style="font-size:1.3rem">${ic}</div>
          <div style="font-size:1.4rem;color:${c};font-weight:700">${v}</div>
          <div style="font-size:.62rem;color:#2a6a8a">${l}</div>
        </div>`).join('')}
    </div>
    <div class="bp-title" style="margin-bottom:.4rem">◈ SYSTEM STATUS</div>
    ${[['AI Backend','ONLINE','#00FF99'],['Voice Engine','ACTIVE','#00FF99'],['Memory Banks',facts.length?facts.length+' FACTS':'EMPTY','#00D4FF'],['Accent',accent.toUpperCase(),'#00D4FF'],['Security',lockEnabled?'LOCKED':'OPEN',lockEnabled?'#00FF99':'#FF9944'],['Brain Modules','9 LOADED','#00D4FF']].map(([l,v,c])=>`
      <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #040e1a">
        <span style="color:#2a6a8a;font-size:.8rem">${l}</span>
        <span style="color:${c};font-size:.8rem">${v}</span>
      </div>`).join('')}
    <div class="bp-title" style="margin-top:.75rem;margin-bottom:.4rem">◈ WEEKLY ACTIVITY</div>
    <div style="display:flex;align-items:flex-end;height:100px;gap:4px;margin-bottom:.75rem">${bars}</div>
    <div class="bp-title" style="margin-bottom:.4rem">◈ MEMORY SNAPSHOT</div>
    ${memItems}
    <div class="bp-title" style="margin-top:.75rem;margin-bottom:.4rem">◈ SECURITY</div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:.4rem 0">
      <span style="color:#4a9ab8;font-size:.85rem">App Lock (PIN/Biometric)</span>
      <button class="bp-btn ${lockEnabled?'active':''}" id="lock-toggle" onclick="toggleLock()">${lockEnabled?'🔒 LOCKED':'🔓 UNLOCKED'}</button>
    </div>
  `);
}
function toggleLock() {
  const cur = localStorage.getItem('henry_lock')==='true';
  localStorage.setItem('henry_lock', !cur);
  renderDashboard();
}
function trackHenryUsage(type) {
  if(type==='chat') localStorage.setItem('henry_total_chats', parseInt(localStorage.getItem('henry_total_chats')||'0')+1);
  if(type==='image') localStorage.setItem('henry_images_gen', parseInt(localStorage.getItem('henry_images_gen')||'0')+1);
  if(type==='voice') localStorage.setItem('henry_voice_cmds', parseInt(localStorage.getItem('henry_voice_cmds')||'0')+1);
  const week = JSON.parse(localStorage.getItem('henry_week_activity')||'[0,0,0,0,0,0,0]');
  week[new Date().getDay()]++;
  localStorage.setItem('henry_week_activity', JSON.stringify(week));
}

// ════════════════════════════════════════════════════════
//  10. GAMES
// ════════════════════════════════════════════════════════
const RIDDLES=[['I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?','An echo'],['The more you take, the more you leave behind. What am I?','Footsteps'],['I have cities but no houses, mountains but no trees, water but no fish. What am I?','A map'],['I can fly without wings, cry without eyes. Where I go, darkness follows. What am I?','A cloud'],['What has to be broken before you can use it?','An egg'],['I\'m light as a feather, yet no man can hold me for 5 minutes. What am I?','Breath'],['The more you remove from me, the bigger I become. What am I?','A hole'],['What has hands but cannot clap?','A clock']];
const TRIVIA=[['What is the capital of Iceland?',['Reykjavik','Oslo','Helsinki','Stockholm'],'Reykjavik'],['How many bones in the adult human body?',['206','196','216','186'],'206'],['Which planet has the most moons?',['Saturn','Jupiter','Uranus','Neptune'],'Saturn'],['Who painted the Sistine Chapel?',['Michelangelo','Da Vinci','Raphael','Botticelli'],'Michelangelo'],['What is the speed of light (approx)?',['299,792 km/s','199,792 km/s','399,792 km/s','150,000 km/s'],'299,792 km/s'],['Which element has symbol Au?',['Gold','Silver','Aluminum','Arsenic'],'Gold'],['What is the largest ocean?',['Pacific','Atlantic','Indian','Arctic'],'Pacific'],['How many sides in a dodecagon?',['12','10','8','14'],'12']];
const WYR=['Have the ability to fly OR be invisible?','Always speak the truth OR always be believed?','Live 100 years past OR 100 years future?','Be twice as smart OR twice as happy?','Know HOW you will die OR WHEN you will die?'];

let activeGame=null, currentRiddle=null, ridAns=null, ridScore=0;
let trivIdx=0, trivScore=0;

function renderGames() {
  showBrainPanel(`
    <div class="bp-title">🎮 HENRY GAMES</div>
    <div class="bp-text">Challenge your mind with HENRY. Choose a game to begin.</div>
    <div class="bp-btn-row" style="flex-direction:column">
      <button class="bp-btn" onclick="startGame('riddle')">🎭 Riddles — Stump me if you can</button>
      <button class="bp-btn" onclick="startGame('trivia')">🎯 Trivia Tournament — 8 questions</button>
      <button class="bp-btn" onclick="startGame('20q')">🔍 20 Questions — Can you guess it?</button>
      <button class="bp-btn" onclick="startGame('wyr')">🤔 Would You Rather?</button>
    </div>
    ${ridScore>0?`<div class="bp-score" style="margin-top:.5rem">◈ Riddle Score: ${ridScore} 🏆</div>`:''}
  `);
}

function startGame(game) {
  activeGame = game;
  if(game==='riddle') {
    const r=RIDDLES[Math.floor(Math.random()*RIDDLES.length)];
    currentRiddle=r[0]; ridAns=r[1].toLowerCase();
    showBrainPanel(`
      <div class="bp-title">🎭 RIDDLE · Score: ${ridScore}</div>
      <div class="bp-output">${currentRiddle}</div>
      <input class="bp-textarea" id="riddle-ans" placeholder="Your answer…" style="margin-top:.5rem;min-height:auto;padding:.4rem .7rem">
      <div class="bp-btn-row" style="margin-top:.5rem">
        <button class="bp-btn" onclick="checkRiddle()">✓ CHECK</button>
        <button class="bp-btn danger" onclick="giveUpRiddle()">Give Up</button>
        <button class="bp-btn" onclick="startGame('riddle')">⏭ SKIP</button>
      </div>
      <div class="bp-output" id="riddle-fb" style="display:none;margin-top:.5rem"></div>
    `);
  } else if(game==='trivia') {
    trivIdx=0; trivScore=0; showTriviaQ();
  } else if(game==='20q') {
    const things=['the Eiffel Tower','a black hole','the internet','a dream','the moon','fire','a mirror','time','music','a smartphone'];
    const secret=things[Math.floor(Math.random()*things.length)];
    let qCount=0;
    showBrainPanel(`
      <div class="bp-title">🔍 20 QUESTIONS</div>
      <div class="bp-output" id="q20-display">I'm thinking of something. Ask yes/no questions!</div>
      <input class="bp-textarea" id="q20-input" placeholder="Your yes/no question…" style="margin-top:.5rem;min-height:auto;padding:.4rem .7rem">
      <div id="q20-count" style="color:#2a6a8a;font-size:.75rem;margin-top:.3rem">Questions: 0/20</div>
      <button class="bp-btn" style="margin-top:.5rem" onclick="ask20Q('${secret.replace(/'/g,"\\'")}')">❓ ASK</button>
    `);
  } else if(game==='wyr') {
    const q=WYR[Math.floor(Math.random()*WYR.length)];
    showBrainPanel(`
      <div class="bp-title">🤔 WOULD YOU RATHER?</div>
      <div class="bp-output" style="font-size:1rem">${q}</div>
      <textarea class="bp-textarea" id="wyr-ans" placeholder="Tell me your choice and why…" style="margin-top:.5rem"></textarea>
      <button class="bp-btn" style="margin-top:.5rem" onclick="submitWYR('${q.replace(/'/g,"\\'")}')">◈ HENRY RESPONDS</button>
      <div class="bp-output" id="wyr-out" style="margin-top:.5rem;display:none"></div>
      <button class="bp-btn" style="margin-top:.5rem" onclick="startGame('wyr')">⏭ NEXT QUESTION</button>
    `);
  }
}

function checkRiddle() {
  const ans=(document.getElementById('riddle-ans')||{}).value||'';
  const fb=document.getElementById('riddle-fb');
  const correct=ans.toLowerCase().includes(ridAns)||ridAns.includes(ans.toLowerCase().trim());
  if(fb){fb.style.display='';fb.style.color=correct?'#00ff99':'#ff4444';
  fb.textContent=correct?`✓ Brilliant! The answer is "${ridAns}". Score: ${++ridScore} 🏆`:`✗ Not quite, sir. Try again or give up.`;}
  if(correct) brainSpeak('Brilliant! Correct answer.');
}
function giveUpRiddle(){const fb=document.getElementById('riddle-fb');if(fb){fb.style.display='';fb.style.color='#ff9944';fb.textContent=`The answer was: "${ridAns}"`;}}

function showTriviaQ() {
  if(trivIdx>=TRIVIA.length){
    const grade=trivScore>=7?'🏆 GENIUS':trivScore>=5?'🥇 EXCELLENT':trivScore>=3?'🥈 GOOD':'🥉 KEEP GOING';
    showBrainPanel(`<div class="bp-title">🏁 TRIVIA COMPLETE!</div><div class="bp-output" style="font-size:1.1rem;text-align:center">Score: ${trivScore}/${TRIVIA.length}\n${grade}</div><button class="bp-btn" style="margin-top:.75rem" onclick="startGame('trivia')">▶ PLAY AGAIN</button>`);
    return;
  }
  const [q,opts,correct]=TRIVIA[trivIdx];
  showBrainPanel(`
    <div class="bp-title">🎯 Q${trivIdx+1}/${TRIVIA.length} · Score: ${trivScore}</div>
    <div class="bp-output" style="font-size:.9rem">${q}</div>
    <div class="bp-btn-row" style="flex-direction:column;margin-top:.5rem">
      ${opts.map(o=>`<button class="bp-btn" onclick="checkTrivia('${o.replace(/'/g,"\\'")}','${correct.replace(/'/g,"\\'")}','${q.replace(/'/g,"\\'")}')">  ${o}</button>`).join('')}
    </div>
  `);
}
function checkTrivia(chosen,correct,q){
  const ok=chosen===correct;
  if(ok) trivScore++;
  trivIdx++;
  const fb=ok?`✓ Correct! ${correct}`:`✗ Wrong. Answer: ${correct}`;
  const color=ok?'#00ff99':'#ff4444';
  const el=document.querySelector('#brain-panel-inner .bp-output');
  if(el){el.style.color=color;el.textContent=fb;}
  brainSpeak(ok?'Correct!':'Wrong. The answer was '+correct);
  setTimeout(showTriviaQ,1800);
}
async function ask20Q(secret){
  const inp=document.getElementById('q20-input')||{};
  const cnt=document.getElementById('q20-count');
  const disp=document.getElementById('q20-display');
  const q=(inp.value||'').trim(); if(!q) return;
  const num=parseInt(cnt?.textContent?.match(/\d+/)?.[0]||'0')+1;
  if(cnt) cnt.textContent=`Questions: ${num}/20`;
  if(disp) disp.textContent='Thinking…';
  const prompt=`You are playing 20 Questions. The secret thing is "${secret}". The user asked: "${q}". Answer only YES or NO (add a tiny hint if it helps). If they guessed correctly say "Yes! You got it!" and reveal. They have used ${num} of 20 questions.`;
  const reply=await askHenryBrain(prompt);
  if(disp) disp.textContent=reply;
  if(inp) inp.value='';
  brainSpeak(reply.substring(0,80));
  if(num>=20&&!reply.toLowerCase().includes('yes')) {
    if(disp) disp.textContent+=`\n\n(Game over! The answer was: ${secret})`;
  }
}
async function submitWYR(q){
  const ans=(document.getElementById('wyr-ans')||{}).value||'';
  if(!ans.trim()) return;
  const out=document.getElementById('wyr-out');
  if(out){out.style.display='';out.textContent='Thinking…';}
  const reply=await askHenryBrain(`Would you rather game. Question: "${q}"\n\nUser chose: "${ans}"\n\nRespond as HENRY — be witty, insightful, share your own opinion on which you'd pick and why. 2-3 sentences.`);
  if(out) out.textContent=reply;
  brainSpeak(reply.substring(0,200));
}

// ════════════════════════════════════════════════════════
//  11. LIVE TRACKING
// ════════════════════════════════════════════════════════
function renderTracking() {
  showBrainPanel(`
    <div class="bp-title">📡 LIVE TRACKING</div>
    <div class="bp-btn-row" style="flex-direction:column">
      <button class="bp-btn" onclick="showTrackPanel('flight')">✈ Flight Tracker</button>
      <button class="bp-btn" onclick="showTrackPanel('sports')">⚽ Sports Scores</button>
      <button class="bp-btn" onclick="showTrackPanel('package')">📦 Package Tracker</button>
    </div>
  `);
}
function showTrackPanel(type) {
  if(type==='flight') {
    showBrainPanel(`
      <div class="bp-title">✈ FLIGHT TRACKER</div>
      <div class="bp-text">Enter a flight number (e.g. EK201, QR102, SQ318)</div>
      <input class="bp-textarea" id="flight-num" placeholder="Flight number…" style="min-height:auto;padding:.4rem .7rem">
      <button class="bp-btn" style="margin-top:.5rem" onclick="trackFlight()">◈ TRACK FLIGHT</button>
      <div class="bp-output" id="flight-out" style="margin-top:.5rem;display:none"></div>
    `);
  } else if(type==='sports') {
    showBrainPanel(`
      <div class="bp-title">⚽ SPORTS SCORES</div>
      <div class="bp-btn-row" style="flex-direction:column">
        <button class="bp-btn" onclick="fetchSports('Premier League','4328')">🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League</button>
        <button class="bp-btn" onclick="fetchSports('NBA','4387')">🏀 NBA Basketball</button>
        <button class="bp-btn" onclick="fetchSports('La Liga','4335')">🇪🇸 La Liga</button>
        <button class="bp-btn" onclick="fetchSports('Bundesliga','4331')">🇩🇪 Bundesliga</button>
        <button class="bp-btn" onclick="fetchSports('Serie A','4332')">🇮🇹 Serie A</button>
      </div>
      <div class="bp-output" id="sports-out" style="margin-top:.5rem;display:none"></div>
    `);
  } else if(type==='package') {
    showBrainPanel(`
      <div class="bp-title">📦 PACKAGE TRACKER</div>
      <div class="bp-text">Select courier and enter tracking number</div>
      <select id="courier-sel" style="width:100%;background:#040e1a;border:1px solid #0a2a3a;color:#00D4FF;padding:.4rem;border-radius:6px;margin-bottom:.5rem">
        <option value="https://www.dhl.com/ae-en/home/tracking.html?tracking-id=">DHL</option>
        <option value="https://www.fedex.com/fedextrack/?trknbr=">FedEx</option>
        <option value="https://www.ups.com/track?tracknum=">UPS</option>
        <option value="https://www.aramex.com/ae/en/track/results?ShipmentNumber=">Aramex</option>
        <option value="https://parcelsapp.com/en/tracking/">Universal</option>
      </select>
      <input class="bp-textarea" id="pkg-num" placeholder="Tracking number…" style="min-height:auto;padding:.4rem .7rem">
      <button class="bp-btn" style="margin-top:.5rem" onclick="trackPackage()">◈ TRACK PACKAGE</button>
    `);
  }
}
async function trackFlight() {
  const num=(document.getElementById('flight-num')||{}).value?.trim().toUpperCase();
  if(!num){return;}
  const out=document.getElementById('flight-out');
  if(out){out.style.display='';out.textContent='Tracking '+num+'…';}
  try {
    const r=await fetch('https://opensky-network.org/api/states/all',{signal:AbortSignal.timeout(8000)});
    if(r.ok){
      const d=await r.json();
      const states=d?.states||[];
      const match=states.find(s=>s[1]?.trim().toUpperCase().includes(num));
      if(match){
        const [,cs,country,,,lon,lat,alt,,spd,,,,,,, grnd]=match;
        const info=`✈ <b>${cs?.trim()||num}</b><br>
          Status: <b style="color:${grnd?'#FF9944':'#00FF99'}">${grnd?'On Ground':'Airborne'}</b><br>
          Country: ${country}<br>
          Position: ${parseFloat(lat||0).toFixed(2)}N, ${parseFloat(lon||0).toFixed(2)}E<br>
          Altitude: ${Math.round(alt||0)} m<br>
          Speed: ${Math.round((spd||0)*3.6)} km/h<br><br>
          <a href="https://www.flightradar24.com/${cs?.trim()||num}" target="_blank" style="color:#00D4FF">&#x27A4; View on Flightradar24</a>`;
        if(out) out.innerHTML=info;
        brainSpeak('Flight tracked. '+cs?.trim()+' is '+(grnd?'on the ground':'airborne'));
        return;
      }
    }
  } catch(e){}
  if(out) out.innerHTML=`Flight <b>${num}</b>: Live data not found in OpenSky database right now.<br><br>
    Try these live trackers:<br>
    <a href="https://www.flightradar24.com/${num}" target="_blank" style="color:#00D4FF">&#x27A4; flightradar24.com/${num}</a><br>
    <a href="https://flightaware.com/live/flight/${num}" target="_blank" style="color:#00D4FF">&#x27A4; flightaware.com/live/flight/${num}</a><br>
    <a href="https://www.flightstats.com/v2/flight-tracker/${num.slice(0,2)}/${num.slice(2)}" target="_blank" style="color:#00D4FF">&#x27A4; flightstats.com - ${num}</a>`;
}
async function fetchSports(name, leagueId) {
  const out=document.getElementById('sports-out');
  if(out){out.style.display='';out.textContent='Fetching '+name+' scores…';}
  try {
    const r=await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${leagueId}`,{signal:AbortSignal.timeout(8000)});
    if(r.ok){
      const d=await r.json();
      const events=d?.events;
      if(events?.length){
        const recent=events.slice(-5).reverse();
        const text=name+' — Recent Results:\n\n'+recent.map(e=>`${e.strHomeTeam} ${e.intHomeScore||'?'} – ${e.intAwayScore||'?'} ${e.strAwayTeam}\n${e.dateEvent}`).join('\n\n');
        if(out) out.textContent=text; return;
      }
    }
  } catch(e){}
  if(out) out.textContent='Live scores unavailable. Try bbc.com/sport or espn.com for latest '+name+' results.';
}
function trackPackage() {
  const url=(document.getElementById('courier-sel')||{}).value||'https://parcelsapp.com/en/tracking/';
  const num=(document.getElementById('pkg-num')||{}).value?.trim();
  if(!num){alert('Enter a tracking number');return;}
  window.open(url+num,'_blank');
}

// ════════════════════════════════════════════════════════
//  12. SOCIAL MEDIA AI
// ════════════════════════════════════════════════════════
function renderSocial() {
  showBrainPanel(`
    <div class="bp-title">🌐 SOCIAL MEDIA AI</div>
    <div class="bp-text">Generate perfect captions for any platform.\nHENRY writes it — you post it.</div>
    <select id="social-platform" style="width:100%;background:#040e1a;border:1px solid #0a2a3a;color:#00D4FF;padding:.4rem;border-radius:6px;margin-bottom:.5rem">
      <option value="Instagram">📸 Instagram</option>
      <option value="Twitter/X">🐦 Twitter / X</option>
      <option value="TikTok">🎵 TikTok</option>
      <option value="LinkedIn">💼 LinkedIn</option>
      <option value="Facebook">👥 Facebook</option>
    </select>
    <input class="bp-textarea" id="social-topic" placeholder="What is the post about?" style="min-height:auto;padding:.4rem .7rem;margin-bottom:.5rem">
    <select id="social-tone" style="width:100%;background:#040e1a;border:1px solid #0a2a3a;color:#00D4FF;padding:.4rem;border-radius:6px;margin-bottom:.5rem">
      <option value="engaging">Engaging & Friendly</option>
      <option value="professional">Professional</option>
      <option value="funny">Funny & Witty</option>
      <option value="inspirational">Inspirational</option>
      <option value="bold">Bold & Confident</option>
      <option value="storytelling">Storytelling</option>
    </select>
    <button class="bp-btn" onclick="generateCaption()">✨ GENERATE CAPTION</button>
    <div class="bp-output" id="social-out" style="margin-top:.5rem;display:none"></div>
    <button class="bp-btn" id="social-copy" style="margin-top:.5rem;display:none" onclick="copyCaption()">📋 COPY CAPTION</button>
  `);
}
async function generateCaption() {
  const platform=(document.getElementById('social-platform')||{}).value||'Instagram';
  const topic=(document.getElementById('social-topic')||{}).value?.trim()||'my lifestyle';
  const tone=(document.getElementById('social-tone')||{}).value||'engaging';
  const out=document.getElementById('social-out');
  const copyBtn=document.getElementById('social-copy');
  if(out){out.style.display='';out.textContent='Crafting your '+platform+' caption…';}
  const guides={Instagram:'engaging opener, 3-5 sentences, 10 hashtags, emoji-rich, call to action',
    'Twitter/X':'punchy, max 280 chars, 2 hashtags, witty/insightful',
    TikTok:'short and catchy, 15+ trending hashtags, hook first line, Gen-Z energy',
    LinkedIn:'professional, value-driven, 3-5 paragraphs, 5 hashtags, end with question',
    Facebook:'conversational, medium length, shareable, includes a question'};
  const prompt=`Write a ${tone} ${platform} caption for: "${topic}"\n\nStyle: ${guides[platform]||'engaging with hashtags'}\n\nOutput only the ready-to-post caption text. No intro, no explanation.`;
  const reply=await askHenryBrain(prompt);
  if(out) out.textContent=reply;
  if(copyBtn) copyBtn.style.display='';
}
function copyCaption(){const out=document.getElementById('social-out');if(out&&out.textContent){navigator.clipboard.writeText(out.textContent);alert('Caption copied! ✓');}}

// ════════════════════════════════════════════════════════
//  13. SMART HOME
// ════════════════════════════════════════════════════════
function renderSmartHome() {
  showBrainPanel(`
    <div class="bp-title">🏠 SMART HOME</div>
    <div class="bp-text">HENRY can connect to your smart home hub or guide you to control devices.</div>
    <div class="bp-btn-row" style="flex-direction:column">
      <button class="bp-btn" onclick="openHub('google_home')">🏠 Open Google Home</button>
      <button class="bp-btn" onclick="openHub('alexa')">🔵 Open Amazon Alexa</button>
      <button class="bp-btn" onclick="openHub('hue')">💡 Philips Hue</button>
      <button class="bp-btn" onclick="showHAConnect()">⚙ Home Assistant Setup</button>
    </div>
    <div class="bp-title" style="margin-top:.75rem;margin-bottom:.4rem">◈ VOICE COMMAND DEVICE</div>
    <input class="bp-textarea" id="sh-cmd" placeholder="e.g. turn on living room lights, set AC to 22°C…" style="min-height:auto;padding:.4rem .7rem">
    <button class="bp-btn" style="margin-top:.5rem" onclick="smartHomeAI()">◈ HENRY ADVISES</button>
    <div class="bp-output" id="sh-out" style="margin-top:.5rem;display:none"></div>
  `);
}
function openHub(hub) {
  const urls={google_home:'https://home.google.com',alexa:'https://alexa.amazon.com',hue:'https://www.philips-hue.com/en-gb/explore-hue/apps/bridge'};
  window.open(urls[hub]||'https://home.google.com','_blank');
}
function showHAConnect() {
  showBrainPanel(`
    <div class="bp-title">⚙ HOME ASSISTANT</div>
    <div class="bp-text">Connect your local Home Assistant server for full HENRY integration.</div>
    <input class="bp-textarea" id="ha-url" placeholder="HA URL e.g. http://homeassistant.local:8123" style="min-height:auto;padding:.4rem .7rem;margin-bottom:.5rem">
    <input class="bp-textarea" id="ha-token" placeholder="Long-lived access token" style="min-height:auto;padding:.4rem .7rem;margin-bottom:.5rem" type="password">
    <button class="bp-btn" onclick="saveHAConfig()">💾 SAVE & TEST</button>
    <div class="bp-output" id="ha-out" style="margin-top:.5rem;display:none"></div>
  `);
}
async function saveHAConfig() {
  const url=(document.getElementById('ha-url')||{}).value?.trim();
  const token=(document.getElementById('ha-token')||{}).value?.trim();
  if(!url||!token){alert('Enter both URL and token');return;}
  localStorage.setItem('henry_ha_url',url);
  localStorage.setItem('henry_ha_token',token);
  const out=document.getElementById('ha-out');
  if(out){out.style.display='';out.textContent='Testing connection…';}
  try {
    const r=await fetch(url.replace(/\/$/,'')+'/api/',{headers:{'Authorization':'Bearer '+token},signal:AbortSignal.timeout(5000)});
    if(r.ok){if(out) out.textContent='✓ Connected to Home Assistant! HENRY can now control your home.';}
    else{if(out) out.textContent='Connection failed ('+r.status+'). Check URL and token.';}
  } catch(e){if(out) out.textContent='Could not reach '+url+'. Ensure you are on the same network.';}
}
async function smartHomeAI() {
  const cmd=(document.getElementById('sh-cmd')||{}).value?.trim();
  if(!cmd) return;
  const haUrl=localStorage.getItem('henry_ha_url');
  const haToken=localStorage.getItem('henry_ha_token');
  const out=document.getElementById('sh-out');
  if(out){out.style.display='';out.textContent='Processing smart home command…';}
  if(haUrl&&haToken) {
    // Try HA
    const reply=await askHenryBrain(`The user wants to: "${cmd}"\nThey have a Home Assistant at ${haUrl}.\nDetermine the entity_id and service call needed. Tell them exactly which Home Assistant service to call, or confirm what HENRY would send.`);
    if(out) out.textContent=reply;
  } else {
    const reply=await askHenryBrain(`Smart home command: "${cmd}"\nGive practical guidance on how to do this with Google Home, Alexa, or Home Assistant. Be specific and direct.`);
    if(out) out.textContent=reply;
  }
}

// ════════════════════════════════════════════════════════
//  14. BUSINESS TOOLS
// ════════════════════════════════════════════════════════
function renderBusiness() {
  showBrainPanel(`
    <div class="bp-title">💼 BUSINESS TOOLS</div>
    <div class="bp-text">Professional documents generated by HENRY AI. Ready to use instantly.</div>
    <div class="bp-btn-row" style="flex-direction:column">
      <button class="bp-btn" onclick="showBusinessPanel('invoice')">🧾 Invoice Generator</button>
      <button class="bp-btn" onclick="showBusinessPanel('contract')">📋 Contract / NDA</button>
      <button class="bp-btn" onclick="showBusinessPanel('pitch')">🚀 Pitch Deck</button>
      <button class="bp-btn" onclick="showBusinessPanel('business_plan')">📈 Business Plan</button>
      <button class="bp-btn" onclick="showBusinessPanel('swot')">🔍 SWOT Analysis</button>
      <button class="bp-btn" onclick="showBusinessPanel('agenda')">📅 Meeting Agenda</button>
      <button class="bp-btn" onclick="showBusinessPanel('press_release')">📰 Press Release</button>
      <button class="bp-btn" onclick="showBusinessPanel('email')">📧 Professional Email</button>
    </div>
  `);
}
const BIZ_LABELS={invoice:'Invoice',contract:'Contract/NDA',pitch:'Pitch Deck',business_plan:'Business Plan',swot:'SWOT Analysis',agenda:'Meeting Agenda',press_release:'Press Release',email:'Professional Email'};
const BIZ_PLACEHOLDERS={invoice:'Details: client name, services/items, amounts, your company name…',contract:'Parties, scope of work, payment, duration, any special terms…',pitch:'Company name, problem you solve, target market, revenue model, team…',business_plan:'Business name, industry, product/service, target market, location…',swot:'Business or idea to analyse…',agenda:'Meeting purpose, attendees, topics to cover, duration…',press_release:'Announcement, key facts, quotes, company info…',email:'Recipient, purpose, key points you want to communicate…'};
function showBusinessPanel(type) {
  showBrainPanel(`
    <div class="bp-title">💼 ${BIZ_LABELS[type]?.toUpperCase()}</div>
    <textarea class="bp-textarea" id="biz-details" placeholder="${BIZ_PLACEHOLDERS[type]||'Details…'}" style="min-height:120px"></textarea>
    <button class="bp-btn" style="margin-top:.5rem" onclick="generateBizDoc('${type}')">◈ GENERATE DOCUMENT</button>
    <div class="bp-output" id="biz-out" style="margin-top:.5rem;display:none;max-height:350px;overflow-y:auto"></div>
    <button class="bp-btn" id="biz-copy" style="margin-top:.5rem;display:none" onclick="copyBizDoc()">📋 COPY DOCUMENT</button>
  `);
}
async function generateBizDoc(type) {
  const details=(document.getElementById('biz-details')||{}).value?.trim()||'Generic template';
  const out=document.getElementById('biz-out');
  const copyBtn=document.getElementById('biz-copy');
  if(out){out.style.display='';out.textContent='Generating '+BIZ_LABELS[type]+'…';}
  const prompts={
    invoice:`Generate a complete professional invoice in plain text. Details: ${details}. Include: auto invoice number, today's date, 30-day due date, itemized list, subtotal, 5% VAT, total. Clean formatting.`,
    contract:`Write a complete professional service agreement/NDA. Details: ${details}. Include all standard clauses: parties, scope, payment, IP, confidentiality, termination, governing law (UAE). Note: template for reference only — consult a legal professional.`,
    pitch:`Create a complete pitch deck outline for: ${details}. For each of 10 slides: title, 3-5 bullets, key metric or visual suggestion. Make it investor-ready.`,
    business_plan:`Write a comprehensive business plan for: ${details}. Include: Executive Summary, Market Analysis, Business Model, Marketing Strategy, Operations, 3-Year Financial Projections, Funding Needs.`,
    swot:`Perform a detailed SWOT analysis for: ${details}. 5+ points per quadrant. Follow with 3 strategic recommendations.`,
    agenda:`Create a professional meeting agenda for: ${details}. Include time allocations, objectives, action items section.`,
    press_release:`Write a press release for: ${details}. Format: headline, dateline (Dubai UAE), body, quote, boilerplate, contact info.`,
    email:`Write a professional email for: ${details}. Subject line + body. Clear, concise, action-oriented.`,
  };
  const reply=await askHenryBrain(prompts[type]||`Generate a professional ${type} document for: ${details}`);
  if(out) out.textContent=reply;
  if(copyBtn) copyBtn.style.display='';
}
function copyBizDoc(){const out=document.getElementById('biz-out');if(out&&out.textContent){navigator.clipboard.writeText(out.textContent);alert('Document copied! ✓');}}

// ════════════════════════════════════════════════════════
//  Wire "OPEN BRAIN" button in the UI
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  // If there's an "open brain" button in the chat, wire it
  document.querySelectorAll('[data-brain],[onclick*="open brain"],[class*="brain-btn"]').forEach(el=>{
    el.addEventListener('click', openBrain);
  });
  // Wire "open brain" chip / suggestion
  document.querySelectorAll('.suggestion-chip, .orb-btn, .top-btn').forEach(el=>{
    if(el.textContent.toLowerCase().includes('brain')) el.addEventListener('click',openBrain);
  });
});

// ── Expose all panel openers to window so inline onclick works ──
window.openBrain          = openBrain;
window.openBrainModule    = openBrainModule;
