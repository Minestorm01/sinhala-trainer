/* ============================================================================
   Sinhala Trainer – Full app.js
   Free PWA (GitHub Pages) + Google Sheets logging + Google Translate handoff
   ========================================================================== */

/* ==============================
   CONFIG – EDIT THESE TWO LINES
   ============================== */
const SHEET_WEBHOOK = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE'; // e.g. https://script.google.com/macros/s/.../exec
const SHEET_SECRET  = 'CHANGE_ME_LONG_RANDOM';                    // must match SECRET in Apps Script
const STT_ENDPOINT = 'https://sinhala-stt-proxy-601787151206.australia-southeast1.run.app/stt';


/* Optional identifiers */
const USER_ID   = 'me';
const LESSON_ID = 'greetings_01';

/* ==========================================
   LESSON CONTENT (add more as you progress)
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
   STATE + SHORTCUTS
   ================= */
let i = 0; // current card index
const $ = s => document.querySelector(s);

/* DOM elements */
const promptEN     = $('#prompt_en');
const promptSI     = $('#prompt_si');
const hint         = $('#hint');
const heard        = $('#heard');
const scoreBox     = $('#score');
const wordFeedback = $('#wordFeedback');

const btnPlay       = $('#btnPlay');
const btnSlow       = $('#btnSlow');
const btnNext       = $('#btnNext');
const btnCheck      = $('#btnCheck');
const btnOpenGT     = document.querySelector('#btnOpenGT');
const btnPasteCheck = document.querySelector('#btnPasteCheck');

/* ==============
   CARD RENDERING
   ============== */
function loadCard() {
  const c = CARDS[i];
  promptEN.textContent = c.en;
  promptSI.textContent = c.si;
  hint.textContent = c.hint || '';
  heard.value = '';
  scoreBox.textContent = '';
  wordFeedback.innerHTML = '';
}

/* =======
   SPEECH
   ======= */
function speak(text, rate = 1.0) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  // Try Sinhala; if engine lacks it, it will still read the script reasonably
  u.lang = 'si-LK';
  u.rate = rate;
  // Cancel any ongoing utterance to avoid overlaps
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/* ======================
   TOKENIZE + SCORE LOGIC
   ====================== */
function tokenize(t) {
  return (t || '')
    .toLowerCase()               // Sinhala has no case; harmless for latin/phonetic hints
    .replace(/[?.,!…]/g, '')     // strip punctuation
    .split(/\s+/)                // split on spaces
    .filter(Boolean);
}

// Sørensen–Dice coefficient on word bags, with simple multiplicity handling
function scoreMatch(target, heardText) {
  const T = tokenize(target);
  const H = tokenize(heardText);
  if (!T.length && !H.length) return { score: 100, chips: '' };
  if (!T.length || !H.length)  return { score: 0,   chips: '' };

  // bag of words for target with counts
  const bag = new Map();
  for (const w of T) bag.set(w, (bag.get(w) || 0) + 1);

  let matches = 0;
  for (const w of H) {
    const n = bag.get(w) || 0;
    if (n > 0) { matches++; bag.set(w, n - 1); }
  }

  const score = Math.round(100 * (2 * matches) / (T.length + H.length));

  // Per-word chips (T words): green if present in H, amber/red by global score otherwise
  const Hset = new Set(tokenize(heardText));
  const chips = T.map(w => {
    const inHeard = Hset.has(w);
    let cls;
    if (inHeard) cls = 'g';
    else cls = score >= 70 ? 'a' : 'r';
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
        user:     USER_ID,
        lesson_id:LESSON_ID,
        card_id:  card.id,
        target:   card.si,
        heard:    heardText,
        score
      })
    });
  } catch (e) {
    // Likely offline or permissions prompt; we silently continue.
    console.log('Save failed or offline; continuing.', e);
  }
}

/* ===========================
   GOOGLE TRANSLATE INTEGRATION
   =========================== */
// Open Google Translate (web). iOS will prefer app if installed via universal link.
function openGoogleTranslate() {
  // Sinhala source (sl=si), English target (tl=en) – adjust tl if you prefer.
  const webUrl = 'https://translate.google.com/?sl=si&tl=en';
  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

// Paste from clipboard and immediately check (requires user gesture on iOS)
async function pasteAndCheck() {
  try {
    const clip = await navigator.clipboard.readText();
    if (clip && clip.trim()) {
      heard.value = clip.trim();
      doCheck(); // reuse check flow
    } else {
      alert('Clipboard is empty.\nIn Google Translate: copy the Sinhala result, come back, then tap “Paste & Check”.');
    }
  } catch (e) {
    alert('Couldn’t read clipboard.\nOn iPhone: ensure you tapped this button directly and allow paste permission.');
  }
}

/* ===========================================
   URL HANDOFF FROM iOS SHORTCUT (?heard=...)
   =========================================== */
function getParam(name) {
  // also handle hash as query for Shortcut variants
  const url = new URL(window.location.href.replace('#', '?'));
  return url.searchParams.get(name);
}

function autoFillAndCheckFromURL() {
  const incoming = getParam('heard');
  if (!incoming) return;
  const text = decodeURIComponent(incoming).trim();
  if (!text) return;
  heard.value = text;
  doCheck();
  // Clean the URL to avoid re-using the param on refresh
  history.replaceState({}, '', location.pathname);
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
}

/* Bind events */
if (btnPlay)       btnPlay.addEventListener('click', () => speak(CARDS[i].si, 1.0));
if (btnSlow)       btnSlow.addEventListener('click', () => speak(CARDS[i].si, 0.75));
if (btnNext)       btnNext.addEventListener('click', () => { i = (i + 1) % CARDS.length; loadCard(); });
if (btnCheck)      btnCheck.addEventListener('click', doCheck);
if (btnOpenGT)     btnOpenGT.addEventListener('click', openGoogleTranslate);
if (btnPasteCheck) btnPasteCheck.addEventListener('click', pasteAndCheck);

/* ======================
   STARTUP + PWA SERVICE
   ====================== */
function init() {
  loadCard();
  autoFillAndCheckFromURL();
  // Register service worker for offline support (if present)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
