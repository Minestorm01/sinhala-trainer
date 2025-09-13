/* Home grid + lesson view + hash router */
const SHEET_WEBHOOK='';const SHEET_SECRET='';const STT_ENDPOINT='https://sinhala-stt-proxy-601787151206.australia-southeast1.run.app/stt';
const PASS_SCORE=85,XP_PER_CORRECT=10,XP_LESSON_BONUS=20,HEARTS_MAX=5,HEART_REFILL_HR=4;

const COURSE=[
  {id:'greet_1', title:'Greetings 1', icon:'🟢', cards:[
    {id:'g1',en:'Hello',si:'හෙලෝ',hint:'he-lo / aa-yu-bo-wan'},
    {id:'g2',en:'How are you?',si:'ඔයාට කොහොම ද?',hint:'o-yaa-ta ko-ho-ma da?'},
    {id:'g3',en:'I’m good',si:'මට හොඳයි',hint:'ma-ta hon-dai'},
  ]},
  {id:'greet_2', title:'Greetings 2', icon:'🟢', cards:[
    {id:'g4',en:'Thank you',si:'ස්තුතියි',hint:'sthuthi-yi'},
    {id:'g5',en:'Please',si:'කරුණාකර',hint:'karu-naa-ka-ra'},
    {id:'g6',en:'Yes',si:'ඔව්',hint:'ov'},
    {id:'g7',en:'No',si:'නැහැ',hint:'næ-hæ'},
  ]},
  {id:'intro_1', title:'Introduce 1', icon:'🟢', cards:[
    {id:'g8',en:'What is your name?',si:'ඔයාගේ නම මොකක්ද?',hint:'o-yaa-ge na-ma mo-kak-da?'},
    {id:'g9',en:'My name is …',si:'මගේ නම …',hint:'ma-ge na-ma …'},
    {id:'g10',en:'See you later',si:'ඉඳලා එන්නම්',hint:'indalaa en-nam'},
  ]},
];

let GAME=JSON.parse(localStorage.getItem('game')||'null')||{hearts:HEARTS_MAX,xp:0,level:1,streak:0,lastPlayDate:null,lastHeartAt:Date.now()};
let PROGRESS=JSON.parse(localStorage.getItem('progress')||'null')||{done:{}};

const $=s=>document.querySelector(s);
const home=$('#home'), lesson=$('#lesson');
const heartsEl=$('#hearts'), xplabel=$('#xplabel'), xpfill=$('#xpfill'), levelEl=$('#level'), streakEl=$('#streak');
const promptEN=$('#prompt_en'),promptSI=$('#prompt_si'),hint=$('#hint'),heard=$('#heard'),scoreBox=$('#score'),wordFeedback=$('#wordFeedback');
const btnMic=$('#btnMic'),btnPlay=$('#btnPlay'),btnSlow=$('#btnSlow'),btnNext=$('#btnNext'),btnCheck=$('#btnCheck');
const btnOpenGT=$('#btnOpenGT'),btnPasteCheck=$('#btnPasteCheck'); const resetHearts=$('#resetHearts');

function save(k,v){localStorage.setItem(k,JSON.stringify(v));}
function refill(){if(GAME.hearts>=HEARTS_MAX)return;const h=(Date.now()-(GAME.lastHeartAt||0))/36e5;const g=Math.floor(h/HEART_REFILL_HR);if(g>0){GAME.hearts=Math.min(HEARTS_MAX,GAME.hearts+g);GAME.lastHeartAt=Date.now();save('game',GAME);}}
function hud(){refill();heartsEl.innerHTML='❤️'.repeat(GAME.hearts)+'<span class="muted">'+'🖤'.repeat(HEARTS_MAX-GAME.hearts)+'</span>';const inXP=GAME.xp%100;xplabel.textContent=`${inXP} / 100 XP`;xpfill.style.width=`${inXP}%`;levelEl.textContent=GAME.level;streakEl.textContent=GAME.streak;}
function addXP(n){const b=GAME.xp;GAME.xp+=n;if(Math.floor(GAME.xp/100)>Math.floor(b/100))GAME.level+=1;save('game',GAME);hud();}
function lose(){if(GAME.hearts>0){GAME.hearts-=1;save('game',GAME);hud();}}
resetHearts?.addEventListener('click',()=>{GAME.hearts=HEARTS_MAX;save('game',GAME);hud();});

function router(){const hash=location.hash||'#/home';if(hash.startsWith('#/lesson/')){home.classList.remove('active');lesson.classList.add('active');startLesson(hash.split('/')[2]);}else{home.classList.add('active');lesson.classList.remove('active');renderHome();}}
window.addEventListener('hashchange',router);

function renderHome(){const grid=$('#homeGrid');grid.innerHTML='';COURSE.forEach((l,i)=>{const done=!!PROGRESS.done[l.id];const div=document.createElement('div');div.className='node '+(done?'done':'');div.innerHTML=`<span class="big">🦉</span><div class="title">${l.title}</div>`;div.onclick=()=>{location.hash=`#/lesson/${l.id}`};grid.appendChild(div);});hud();}

let CARDSET=[],cursor=0,currentLesson=null;
function startLesson(id){currentLesson=id;CARDSET=(COURSE.find(x=>x.id===id)?.cards)||[];cursor=0;loadCard();hud();}
function finishLesson(){PROGRESS.done[currentLesson]=true;save('progress',PROGRESS);addXP(XP_LESSON_BONUS);location.hash='#/home';}

function loadCard(){const c=CARDSET[cursor]||{};promptEN.textContent=c.en||'';promptSI.textContent=c.si||'';hint.textContent=c.hint||'';heard.value='';scoreBox.textContent='';wordFeedback.innerHTML='';}

function speak(text,rate=1.0){if(!('speechSynthesis'in window))return;const u=new SpeechSynthesisUtterance(text);u.lang='si-LK';u.rate=rate;speechSynthesis.cancel();speechSynthesis.speak(u);}
function tokenize(t){return(t||'').toLowerCase().replace(/[?.,!…]/g,'').split(/\s+/).filter(Boolean);}
function scoreMatch(target,heardText){const T=tokenize(target),H=tokenize(heardText);if(!T.length&&!H.length)return{score:100,chips:''};if(!T.length||!H.length)return{score:0,chips:''};const bag=new Map();for(const w of T)bag.set(w,(bag.get(w)||0)+1);let m=0;for(const w of H){const n=bag.get(w)||0;if(n>0){m++;bag.set(w,n-1)}}const score=Math.round(100*(2*m)/(T.length+H.length));const Hs=new Set(H);const chips=T.map(w=>`<span class="chip ${Hs.has(w)?'g':(score>=70?'a':'r')}">${w}</span>`).join(' ');return{score,chips};}

async function saveResult(c,heardText,score){if(!SHEET_WEBHOOK||!SHEET_SECRET)return;try{await fetch(SHEET_WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:SHEET_SECRET,user:'me',lesson_id:currentLesson,card_id:c.id,target:c.si,heard:heardText,score})});}catch{}}

async function blobToBase64(b){const buf=await b.arrayBuffer();const bytes=new Uint8Array(buf);let s='';for(let i=0;i<bytes.byteLength;i++)s+=String.fromCharCode(bytes[i]);return btoa(s);}
async function startRecording(){if(!navigator.mediaDevices?.getUserMedia){alert('Microphone not available.');return null;}const stream=await navigator.mediaDevices.getUserMedia({audio:true});const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';const chunks=[];const rec=new MediaRecorder(stream,{mimeType:mime});return new Promise(r=>{rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());r(new Blob(chunks,{type:mime}))};rec.start();setTimeout(()=>rec.state!=='inactive'&&rec.stop(),4000);});}
async function sttTranscribe(blob){const audioBase64=await blobToBase64(blob);const resp=await fetch(STT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64,mimeType:blob.type})});const data=await resp.json();if(!data.ok)throw new Error(data.error||'stt_failed');return(data.transcript||'').trim();}

function doCheck(){const c=CARDSET[cursor];const heardText=heard.value.trim();const {score,chips}=scoreMatch(c.si,heardText);scoreBox.textContent=`Score: ${score}/100`;wordFeedback.innerHTML=chips;saveResult(c,heardText,score);if(score>=PASS_SCORE){addXP(XP_PER_CORRECT);}else{lose();}}
btnMic?.addEventListener('click',async()=>{try{scoreBox.textContent='Listening…';wordFeedback.innerHTML='';const blob=await startRecording();if(!blob){scoreBox.textContent='';return;}scoreBox.textContent='Transcribing…';const t=await sttTranscribe(blob);heard.value=t;doCheck();}catch(e){console.error(e);scoreBox.textContent='';alert('Could not capture/transcribe.');}});
btnPlay?.addEventListener('click',()=>speak(CARDSET[cursor]?.si||'',1.0));
btnSlow?.addEventListener('click',()=>speak(CARDSET[cursor]?.si||'',0.75));
btnNext?.addEventListener('click',()=>{cursor++;if(cursor>=CARDSET.length){finishLesson();return;}loadCard();});
btnCheck?.addEventListener('click',doCheck);
btnOpenGT?.addEventListener('click',()=>window.open('https://translate.google.com/?sl=si&tl=en','_blank','noopener,noreferrer'));
btnPasteCheck?.addEventListener('click',async()=>{try{const clip=await navigator.clipboard.readText();if(clip&&clip.trim()){heard.value=clip.trim();doCheck();}else{alert('Clipboard is empty.');}}catch{alert('Allow paste permission and try again.');}});

function init(){hud();router();if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}}
document.addEventListener('DOMContentLoaded',init);
