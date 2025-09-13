/* Minimal free Sinhala trainer – no Firebase, PWA + Google Sheet webhook */

// ==== CONFIG ====
const SHEET_WEBHOOK = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
const SHEET_SECRET  = 'CHANGE_ME_LONG_RANDOM'; // same as Apps Script SECRET
const USER_ID       = 'me';                     // change if you want
const LESSON_ID     = 'greetings_01';

// Lesson content (you can move this to a JSON file later)
const CARDS = [
  { id:'g1', en:'Hello', si:'හෙලෝ', hint:'he-lo / aa-yu-bo-wan' },
  { id:'g2', en:'How are you?', si:'ඔයාට කොහොම ද?', hint:'o-yaa-ta ko-ho-ma da?' },
  { id:'g3', en:'I’m good', si:'මට හොඳයි', hint:'ma-ta hon-dai' },
  { id:'g4', en:'Thank you', si:'ස්තුතියි', hint:'sthuthi-yi' },
  { id:'g5', en:'Please', si:'කරුණාකර', hint:'karu-naa-ka-ra' },
  { id:'g6', en:'Yes', si:'ඔව්', hint:'ov' },
  { id:'g7', en:'No', si:'නැහැ', hint:'næ-hæ' },
  { id:'g8', en:'What is your name?', si:'ඔයාගේ නම මොකක්ද?', hint:'o-yaa-ge na-ma mo-kak-da?' },
  { id:'g9', en:'My name is …', si:'මගේ නම …', hint:'ma-ge na-ma …' },
  { id:'g10', en:'See you later', si:'ඉඳලා එන්නම්', hint:'indalaa en-nam' },
];

let i = 0;

const $ = s => document.querySelector(s);
const promptEN = $('#prompt_en');
const promptSI = $('#prompt_si');
const hint = $('#hint');
const heard = $('#heard');
const scoreBox = $('#score');
const wordFeedback = $('#wordFeedback');

function loadCard() {
  const c = CARDS[i];
  promptEN.textContent = c.en;
  promptSI.textContent = c.si;
  hint.textContent = c.hint || '';
  heard.value = '';
  scoreBox.textContent = '';
  wordFeedback.innerHTML = '';
}

function speak(text, rate=1.0) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  // Try set Sinhala; if unavailable, default engine still reads Sinhala script acceptably
  u.lang = 'si-LK';
  u.rate = rate;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// Simple tokenizer + Sørensen–Dice word overlap scoring
function tokenize(t) {
  return (t || '')
    .toLowerCase()
    .replace(/[?.,!…]/g,'')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreMatch(target, heard) {
  const T = tokenize(target);
  const H = tokenize(heard);
  let matches = 0;
  const bag = new Map();
  for (const w of T) bag.set(w, (bag.get(w)||0)+1);
  for (const w of H) {
    const n = bag.get(w)||0;
    if (n > 0) { matches++; bag.set(w, n-1); }
  }
  const score = Math.round(100 * (2*matches) / (T.length + H.length || 1));
  // Build per-word feedback chips
  const chips = T.map(w=>{
    // seen in H?
    const inHeard = tokenize(heard).includes(w);
    const cls = score>=85 ? 'g' : (score>=70 ? (inHeard?'g':'a') : (inHeard?'a':'r'));
    return `<span class="chip ${cls}">${w}</span>`;
  }).join(' ');
  return {score, chips};
}

async function saveResult(card, heardText, score) {
  try {
    await fetch(SHEET_WEBHOOK, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        secret: SHEET_SECRET,
        user: USER_ID,
        lesson_id: LESSON_ID,
        card_id: card.id,
        target: card.si,
        heard: heardText,
        score
      })
    });
  } catch (e) {
    console.log('Save failed (offline?) – will just continue.');
  }
}

// UI bindings
$('#btnPlay').addEventListener('click', ()=> speak(CARDS[i].si, 1.0));
$('#btnSlow').addEventListener('click', ()=> speak(CARDS[i].si, 0.75));
$('#btnNext').addEventListener('click', ()=>{
  i = (i + 1) % CARDS.length;
  loadCard();
});
$('#btnCheck').addEventListener('click', async ()=>{
  const c = CARDS[i];
  const heardText = heard.value.trim();
  const {score, chips} = scoreMatch(c.si, heardText);
  scoreBox.textContent = `Score: ${score}/100`;
  wordFeedback.innerHTML = chips;
  saveResult(c, heardText, score);
});

// Start
loadCard();

// Register service worker (offline installable)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
