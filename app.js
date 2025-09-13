/* ============================================================================
   Sinhala Trainer – app.js with HUD (hearts, XP/level, streak)
   ========================================================================== */

/* ==============================
   CONFIG — paste YOUR values
   ============================== */
const SHEET_WEBHOOK = 'YOUR_APPS_SCRIPT_WEB_APP_URL';
const SHEET_SECRET  = 'YOUR_SECRET_STRING';
const STT_ENDPOINT  = 'https://sinhala-stt-proxy-601787151206.australia-southeast1.run.app/stt';

/* Game tuning (HUD logic only) */
const PASS_SCORE      = 85;   // >= pass counts as correct
const XP_PER_CORRECT  = 10;   // XP per correct card
const HEARTS_MAX      = 5;    // total hearts shown
const HEART_REFILL_HR = 4;    // +1 heart every 4h if below max

/* Optional identifiers */
const USER_ID   = 'me';
const LESSON_ID = 'greetings_01';

/* ==========================================
   LESSON CONTENT
   ========================================== */
const CARDS = [
  { id:'g1',  en:'Hello',               si:'හෙලෝ',                    hint:'he-lo / aa-yu-bo-wan' },
  { id:'g2',  en:'How are you?',        si:'ඔයාට කොහොම ද?',           hint:'o-yaa-ta ko-ho-ma da?' },
  { id:'g3',  en:'I’m good',            si:'මට හොඳයි',                 hint:'ma-ta hon-dai' },
  { id:'g4',  en:'Thank you',           si:'ස්තුතියි',                 hint:'sthuthi-yi' },
  { id:'g5',  en:'Please',              si:'කරුණාකර',                   hint:'karu-naa-ka-ra' },
  { id:'g6',  en:'Yes',                 si:'ඔව්',                       hint:'ov' },
  { id:'g7',  en:'No',                  si:'නැහැ',                      hint:'næ-hæ' },
  { id:'g8',  en:'What is your name?',  si:'ඔයාගේ නම මොකක්ද?',         hint:'o-yaa-ge na-ma mo-kak-da?' },
  { id:'g9',  en:'My name is …',        si:'මගේ නම …',                  hint:'ma-ge na-ma …' },
  { id:'g10', en:'See you later',       si:'ඉඳලා එන්නම්',               hint:'indalaa en-nam' }
];

/* =================
   STATE + UI HOOKS
   ================= */
let i = 0; // current card index
const $ = s => document.querySelector(s);

/* DOM */
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

/* =================
   GAME STATE (HUD)
   ================= */
const store = {
  load() { try { return JSON.parse(localStorage.getItem('game')||'') || null } catch(e){ return null } },
  save(s) { localStorage.setItem('game', JSON.stringify(s)); }
};
function newGame(){
  return {
    hearts: HEARTS_MAX,
    xp: 0,
    level: 1,
    streak: 0,
    lastPlayDate: null,
    lastHeartAt: Date.now()
  };
}
let GAME = store.load() || newGame();

// Refill hearts slowly (if under max)
function maybeRefillHearts(){
  if (GAME.hearts >= HEARTS_MAX) return;
  const hours = (Date.now() - (GAME.lastHeartAt||0)) / 3600000;
  const gained = Math.floor(hours / HEART_REFILL_HR);
  if (gained > 0){
    GAME.hearts = Math.min(HEARTS_MAX, GAME.hearts + gained);
    GAME.lastHeartAt = Date.now();
    store.save(GAME);
  }
}

function updateHUD(){
  maybeRefillHearts();
  // Hearts
  heartsEl.innerHTML = '❤️'.repeat(GAME.hearts) + '<span class="muted">'+ '🖤'.repeat(HEARTS_MAX - GAME.hearts) + '</span>';
  // XP/Level — simple 100 XP per level
  const inLevelXP = GAME.xp % 100;
  xplabel.textContent = `${inLevelXP} / 100 XP`;
  xpfill.style.width = `${inLevelXP}%`;
  levelEl.textContent = GAME.level;
  streakEl.textContent = GAME.streak;
  // Disable actions if out of hearts
  const out = GAME.hearts === 0;
  if (btnMic)   btnMic.disabled   = out;
  if (btnCheck) btnCheck.disabled = out;
}

function addXP(n){
  const before = GAME.xp;
  GAME.xp += n;
  const leveled = Math.floor(GAME.xp / 100) > Math.floor(before / 100);
  if (leveled) GAME.level += 1;
  store.save(GAME);
  updateHUD();
}

function loseHeart(){
  if (GAME.hearts <= 0) return;
  GAME.hearts -= 1;
  if (GAME.hearts === 0){
    scoreBox.textContent = 'Out of hearts — come back later!';
  }
  store.save(GAME);
  updateHUD();
}

function bumpStreakIfNewDay(){
  const today = new Date(); today.setHours(0,0,0,0);
  const last = GAME.lastPlayDate ? new Date(GAME.lastPlayDate) : null;
  const isFirstActionThisLaunch = !last || last.getTime() !== today.getTime();
  if (isFirstActionThisLaunch){
    if (!last) GAME.streak = 1;
    else {
      const diffDays = Math.round((today - last) / 86400000);
      GAME.streak = diffDays === 1 ? GAME.streak + 1 : 1;
    }
    GAME.lastPlayDate = today.toISOString();
    store.save(GAME);
    updateHUD();
  }
}

/* ==============
   RENDER CARD
   ============== */
function loadCard() {
  const c = CARDS[i];
  promptEN.textContent = c.en;
  promptSI.textContent = c.si;
  hint.textContent = c.hint || '';
  heard.value = '';
  scoreBox.textContent = '';
  wordFeedback.innerHTML = '';
  updateHUD();
}

/* =======
   TTS
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
   TOKENIZE + SCORE
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
   SHEET LOGGING
   ================= */
async function saveResult(card, heardText, score) {
  if (!SHEET_WEBHOOK || !SHEET_SECRET) return;
  try {
    await fetch(SHEET_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret:   SHEET_SECRET,
        user:     USER_ID,
        lesson_id:LESSON_ID,
        card_id:  card.id,
        target:   card.si,
        heard:    heardText,
        score
      })
    });
  } catch (e) {
    console.log('Save failed or offline; continuing.', e);
  }
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
   HANDLERS
   =========== */
function doCheck() {
  const c = CARDS[i];
  const heardText = heard.value.trim();
  const { score, chips } = scoreMatch(c.si, heardText);
  scoreBox.textContent = `Score: ${score}/100`;
  wordFeedback.innerHTML = chips;
  saveResult(c, heardText, score);

  // --- HUD mechanics (light-touch)
  if (score >= PASS_SCORE) {
    addXP(XP_PER_CORRECT);
    bumpStreakIfNewDay();
  } else {
    loseHeart();
  }
}

if (btnMic) {
  btnMic.addEventListener('click', async () => {
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
}
if (btnPlay)       btnPlay.addEventListener('click', () => speak(CARDS[i].si, 1.0));
if (btnSlow)       btnSlow.addEventListener('click', () => speak(CARDS[i].si, 0.75));
if (btnNext)       btnNext.addEventListener('click', () => { i = (i + 1) % CARDS.length; loadCard(); });
if (btnCheck)      btnCheck.addEventListener('click', doCheck);
if (btnOpenGT)     btnOpenGT.addEventListener('click', () => window.open('https://translate.google.com/?sl=si&tl=en', '_blank', 'noopener,noreferrer'));
if (btnPasteCheck) btnPasteCheck.addEventListener('click', async () => {
  try { const clip = await navigator.clipboard.readText(); if (clip && clip.trim()) { heard.value = clip.trim(); doCheck(); } else { alert('Clipboard is empty.'); } }
  catch { alert('Allow paste permission and try again.'); }
});

/* ======================
   STARTUP
   ====================== */
function init() {
  loadCard();
  // If you use the ?heard=... Shortcut flow, keep this tiny helper:
  const url = new URL(window.location.href.replace('#','?'));
  const incoming = url.searchParams.get('heard');
  if (incoming) {
    heard.value = decodeURIComponent(incoming).trim();
    doCheck();
    history.replaceState({}, '', location.pathname);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}
document.addEventListener('DOMContentLoaded', init);
