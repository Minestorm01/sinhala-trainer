============================================================================
   Sinhala Trainer – Duolingo-like home path + lesson view + HUD
   ========================================================================== */

/* ==============================
   CONFIG (keep your values)
   ============================== */
const SHEET_WEBHOOK = 'https://script.google.com/macros/s/AKfycbyIg4Nf3pu73w9-Bint_kheWUhy-3m-pTaXipmSXWDQI4DoYlbf4DVZwakU6WZM0PvhEQ/exec';
const SHEET_SECRET  = 'sinhala12345secret';
const STT_ENDPOINT  = 'https://sinhala-stt-proxy-601787151206.australia-southeast1.run.app/stt';

/* Game tuning */
const PASS_SCORE      = 85;
const XP_PER_CORRECT  = 10;
const XP_LESSON_BONUS = 20;
const HEARTS_MAX      = 5;
const HEART_REFILL_HR = 4;

/* ==============================
   COURSE STRUCTURE (Home Path)
   ============================== */
const COURSE = [
  {
    section: "Section 1",
    units: [
      { id:"u1", title:"Greetings",    icon:"🟢", lessons:[ "greet_1", "greet_2" ]},
      { id:"u2", title:"Introduce",    icon:"🟢", lessons:[ "intro_1" ], lockAfter:"u1" },
      { id:"u3", title:"Food & Drink", icon:"🟢", lessons:[ "food_1" ],  lockAfter:"u2" },
      { id:"u4", title:"Describe",     icon:"🟢", lessons:[ "desc_1" ],  lockAfter:"u3" }
    ]
  }
];

/* Map: lessonId -> cards */
const LESSON_CARDS = {
  greet_1: [
    { id:'g1', en:'Hello',               si:'හෙලෝ',                    hint:'he-lo / aa-yu-bo-wan' },
    { id:'g2', en:'How are you?',        si:'ඔයාට කොහොම ද?',           hint:'o-yaa-ta ko-ho-ma da?' },
    { id:'g3', en:'I’m good',            si:'මට හොඳයි',                 hint:'ma-ta hon-dai' }
  ],
  greet_2: [
    { id:'g4', en:'Thank you',           si:'ස්තුතියි',                 hint:'sthuthi-yi' },
    { id:'g5', en:'Please',              si:'කරුණාකර',                   hint:'karu-naa-ka-ra' },
    { id:'g6', en:'Yes',                 si:'ඔව්',                       hint:'ov' },
    { id:'g7', en:'No',                  si:'නැහැ',                      hint:'næ-hæ' }
  ],
  intro_1: [
    { id:'g8',  en:'What is your name?', si:'ඔයාගේ නම මොකක්ද?',         hint:'o-yaa-ge na-ma mo-kak-da?' },
    { id:'g9',  en:'My name is …',       si:'මගේ නම …',                  hint:'ma-ge na-ma …' },
    { id:'g10', en:'See you later',      si:'ඉඳලා එන්නම්',               hint:'indalaa en-nam' }
  ],
  food_1: [
    { id:'f1', en:'Rice',                si:'බත්',                       hint:'bath' },
    { id:'f2', en:'Water',               si:'වතුර',                      hint:'wathura' },
    { id:'f3', en:'Tea',                 si:'තේ',                        hint:'they' }
  ],
  desc_1: [
    { id:'d1', en:'Big',                 si:'ලොකු',                      hint:'loku' },
    { id:'d2', en:'Small',               si:'පොඩි',                      hint:'podi' },
    { id:'d3', en:'Beautiful',           si:'ලස්සන',                     hint:'lassana' }
  ]
};

/* =================
   STATE + UI HOOKS
   ================= */
let CURRENT_LESSON = null;
let CARDS = [];
let i = 0;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* Views */
const viewHome   = $('#home');
const viewLesson = $('#lesson');
const navHome    = $('#navHome');
const backHome   = $('#backHome');

/* HUD & lesson elements */
const promptEN     = $('#prompt_en');
const promptSI     = $('#prompt_si');
const hint         = $('#hint');
const heard        = $('#heard');
const scoreBox     = $('#score');
const wordFeedback = $('#wordFeedback');
const btnMic       = $('#btnMic');
const btnPlay      = $('#btnPlay');
const btnSlow      = $('#btnSlow');
const btnNext      = $('#btnNext');
const btnCheck     = $('#btnCheck');
const btnOpenGT    = $('#btnOpenGT');
const btnPasteCheck= $('#btnPasteCheck');
const heartsEl     = $('#hearts');
const xplabel      = $('#xplabel');
const xpfill       = $('#xpfill');
const levelEl      = $('#level');
const streakEl     = $('#streak');
const resetHearts  = $('#resetHearts');

/* =================
   GAME STATE (HUD)
   ================= */
const store = {
  load(key, fallback){ try { return JSON.parse(localStorage.getItem(key)||'') ?? fallback } catch(e){ return fallback } },
  save(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
};
function newGame(){
  return { hearts: HEARTS_MAX, xp: 0, level: 1, streak: 0, lastPlayDate: null, lastHeartAt: Date.now() };
}
let GAME = store.load('game', newGame());
let PROGRESS = store.load('progress', { done: {} }); // done[lessonId] = true

function maybeRefillHearts(){
  if (GAME.hearts >= HEARTS_MAX) return;
  const hours = (Date.now() - (GAME.lastHeartAt||0)) / 3600000;
  const gained = Math.floor(hours / HEART_REFILL_HR);
  if (gained > 0){
    GAME.hearts = Math.min(HEARTS_MAX, GAME.hearts + gained);
    GAME.lastHeartAt = Date.now();
    store.save('game', GAME);
  }
}
function updateHUD(){
  maybeRefillHearts();
  heartsEl.innerHTML = '❤️'.repeat(GAME.hearts) + '<span class="muted">'+ '🖤'.repeat(HEARTS_MAX - GAME.hearts) + '</span>';
  const inLevelXP = GAME.xp % 100;
  xplabel.textContent = `${inLevelXP} / 100 XP`;
  xpfill.style.width = `${inLevelXP}%`;
  levelEl.textContent = GAME.level;
  streakEl.textContent = GAME.streak;
  const out = GAME.hearts === 0;
  if (btnMic)   btnMic.disabled   = out;
  if (btnCheck) btnCheck.disabled = out;
}
function addXP(n){
  const before = GAME.xp;
  GAME.xp += n;
  const leveled = Math.floor(GAME.xp / 100) > Math.floor(before / 100);
  if (leveled) GAME.level += 1;
  store.save('game', GAME);
  updateHUD();
}
function loseHeart(){
  if (GAME.hearts <= 0) return;
  GAME.hearts -= 1;
  store.save('game', GAME);
  updateHUD();
}
function bumpStreakIfNewDay(){
  const today = new Date(); today.setHours(0,0,0,0);
  const last = GAME.lastPlayDate ? new Date(GAME.lastPlayDate) : null;
  const isFirstAction = !last || last.getTime() !== today.getTime();
  if (isFirstAction){
    if (!last) GAME.streak = 1;
    else {
      const diffDays = Math.round((today - last) / 86400000);
      GAME.streak = diffDays === 1 ? GAME.streak + 1 : 1;
    }
    GAME.lastPlayDate = today.toISOString();
    store.save('game', GAME);
    updateHUD();
  }
}
resetHearts?.addEventListener('click', ()=>{ GAME.hearts = HEARTS_MAX; store.save('game', GAME); updateHUD(); });

/* =======================
   HOME PATH RENDER
   ======================= */
function isUnitLocked(unit){
  if (!unit.lockAfter) return false;
  const prev = unit.lockAfter;
  const prevLessons = COURSE.flatMap(s => s.units).find(u => u.id === prev)?.lessons || [];
  return !prevLessons.every(lid => !!PROGRESS.done[lid]);
}
function makeNode(lessonId, title, status){
  const div = document.createElement('div');
  div.className = 'node ' + (status==='play'?'play':status==='done'?'done':'lock');
  div.dataset.lesson = lessonId;
  div.innerHTML = `<div class="badge">${status==='done'?'★':'▶'}</div><div class="icon">🦉</div><div class="title">${title}</div>`;
  if (status!=='lock'){
    div.addEventListener('click', ()=> startLesson(lessonId));
  }
  return div;
}
function renderHome(){
  const container = $('#homePath');
  container.innerHTML = '';
  COURSE.forEach(sec => {
    const h = document.createElement('div');
    h.className = 'section';
    h.textContent = sec.section;
    container.appendChild(h);
    const path = document.createElement('div');
    path.className = 'path card';
    // Units
    sec.units.forEach(unit => {
      const locked = isUnitLocked(unit);
      unit.lessons.forEach((lid, idx) => {
        const title = `${unit.title} ${unit.lessons.length>1?idx+1:''}`.trim();
        const status = PROGRESS.done[lid] ? 'done' : (locked ? 'lock' : 'play');
        path.appendChild(makeNode(lid, title, status));
      });
    });
    container.appendChild(path);
  });
  switchView('home');
}

/* ======================
   LESSON VIEW + LOGIC
   ====================== */
function startLesson(lessonId){
  CURRENT_LESSON = lessonId;
  CARDS = LESSON_CARDS[lessonId] || [];
  i = 0;
  loadCard();
  switchView('lesson');
}
function finishLesson(){
  PROGRESS.done[CURRENT_LESSON] = true;
  store.save('progress', PROGRESS);
  addXP(XP_LESSON_BONUS);
  bumpStreakIfNewDay();
  switchView('home');
  renderHome();
}

/* ==============
   CARD RENDERING
   ============== */
function loadCard() {
  const c = CARDS[i];
  promptEN.textContent = c?.en || '';
  promptSI.textContent = c?.si || '';
  hint.textContent = c?.hint || '';
  heard.value = '';
  scoreBox.textContent = '';
  wordFeedback.innerHTML = '';
  updateHUD();
}

/* =======
   SPEECH
   ======= */
function speak(text, rate = 1.0) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'si-LK';
  u.rate = rate;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/* ======================
   TOKENIZE + SCORE LOGIC
   ====================== */
function tokenize(t) {
  return (t || '')
    .toLowerCase()
    .replace(/[?.,!…]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}
function scoreMatch(target, heardText) {
  const T = tokenize(target);
  const H = tokenize(heardText);
  if (!T.length && !H.length) return { score: 100, chips: '' };
  if (!T.length || !H.length)  return { score: 0,   chips: '' };
  const bag = new Map();
  for (const w of T) bag.set(w, (bag.get(w) || 0) + 1);
  let matches = 0;
  for (const w of H) {
    const n = bag.get(w) || 0;
    if (n > 0) { matches++; bag.set(w, n - 1); }
  }
  const score = Math.round(100 * (2 * matches) / (T.length + H.length));
  const Hset = new Set(H);
  const chips = T.map(w => {
    const inHeard = Hset.has(w);
    let cls = inHeard ? 'g' : (score >= 70 ? 'a' : 'r');
    return `<span class="chip ${cls}">${w}</span>`;
  }).join(' ');
  return { score, chips };
}

/* =================
   CLOUD SAVE (SHEET)
   ================= */
async function saveResult(card, heardText, score) {
  try {
    await fetch(SHEET_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret:   SHEET_SECRET,
        user:     'me',
        lesson_id: CURRENT_LESSON || 'unknown',
        card_id:  card.id,
        target:   card.si,
        heard:    heardText,
        score
      })
    });
  } catch {}
}

/* =========================
   MIC RECORDING + STT (GCP)
   ========================= */
async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Microphone not available.");
    return null;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus' : 'audio/webm';
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: mime });
  return new Promise(resolve => {
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      resolve(new Blob(chunks, { type: mime }));
    };
    rec.start();
    setTimeout(() => rec.state !== 'inactive' && rec.stop(), 4000);
  });
}
async function sttTranscribe(blob) {
  const audioBase64 = await blobToBase64(blob);
  const resp = await fetch(STT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType: blob.type })
  });
  const data = await resp.json();
  if (!data.ok) throw new Error(data.error || 'stt_failed');
  return (data.transcript || '').trim();
}

/* ===========
   UI HANDLERS
   =========== */
function doCheck() {
  const c = CARDS[i];
  const heardText = heard.value.trim();
  const { score, chips } = scoreMatch(c.si, heardText);
  scoreBox.textContent = `Score: ${score}/100`;
  wordFeedback.innerHTML = chips;
  saveResult(c, heardText, score);
  if (score >= PASS_SCORE) {
    addXP(XP_PER_CORRECT);
  } else {
    loseHeart();
  }
}
btnMic?.addEventListener('click', async () => {
  try {
    if (GAME.hearts === 0) return;
    scoreBox.textContent = 'Listening…';
    wordFeedback.innerHTML = '';
    const blob = await startRecording();
    if (!blob) { scoreBox.textContent = ''; return; }
    scoreBox.textContent = 'Transcribing…';
    const transcript = await sttTranscribe(blob);
    heard.value = transcript;
    doCheck();
  } catch (e) {
    console.error(e);
    scoreBox.textContent = '';
    alert('Could not capture/transcribe.');
  }
});
btnPlay?.addEventListener('click', () => speak(CARDS[i]?.si || '', 1.0));
btnSlow?.addEventListener('click', () => speak(CARDS[i]?.si || '', 0.75));
btnNext?.addEventListener('click', () => {
  i++;
  if (i >= CARDS.length) { finishLesson(); return; }
  loadCard();
});
btnCheck?.addEventListener('click', doCheck);
btnOpenGT?.addEventListener('click', () => window.open('https://translate.google.com/?sl=si&tl=en', '_blank', 'noopener,noreferrer'));
btnPasteCheck?.addEventListener('click', async () => {
  try { const clip = await navigator.clipboard.readText(); if (clip && clip.trim()) { heard.value = clip.trim(); doCheck(); } else { alert('Clipboard is empty.'); } }
  catch { alert('Allow paste permission and try again.'); }
});

navHome?.addEventListener('click', (e)=>{ e.preventDefault(); switchView('home'); });
backHome?.addEventListener('click', ()=> switchView('home'));

/* ======================
   VIEW ROUTER
   ====================== */
function switchView(name){
  viewHome.classList.remove('active');
  viewLesson.classList.remove('active');
  if (name==='home') viewHome.classList.add('active');
  else viewLesson.classList.add('active');
}

/* ======================
   STARTUP
   ====================== */
function init() {
  updateHUD();
  renderHome();
  // optional URL handoff (?heard=)
  const url = new URL(window.location.href.replace('#','?'));
  const incoming = url.searchParams.get('heard');
  if (incoming) {
    heard.value = decodeURIComponent(incoming).trim();
    switchView('lesson');
    doCheck();
    history.replaceState({}, '', location.pathname);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}
document.addEventListener('DOMContentLoaded', init);
