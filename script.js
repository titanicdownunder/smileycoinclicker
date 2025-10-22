const KEY = "smiley_click_count_v1";
const KO_KEY = "smiley_last_gameover";
const RETRY_FLAG = "smiley_retrying";
const INACT_MS = 10_000;

let chaosRunning = false;
let halloweenMode = false;
let chaosTimer = null;
let inactivityTimer = null;
let dead = false;

/* ---------- counter ---------- */
function getCount(){ const raw = localStorage.getItem(KEY); return Number.isFinite(+raw) ? +raw : 0; }
function setCount(n){
  localStorage.setItem(KEY, String(n));
  const el = document.getElementById("count");
  if (el){ el.textContent = n; el.classList.add("bump"); setTimeout(()=>el.classList.remove("bump"),200); }
  checkMilestones(n);
}
function bump(){ if (!dead){ setCount(getCount()+1); restartInactivityTimer(); } }

/* ---------- overlay / gameover ---------- */
const TAUNTS = {
  inactivity: ["Fell asleep? AREN’T YOU HAPPY?!","Ten seconds of silence... a lifetime of shame.","You blinked. The smiley cried."],
  refresh: ["You left? AREN’T YOU HAPPY!?","Refresh to run away? LOSER! TRY AGAIN!!!","Escape key warrior. Come back braver."],
  leave: ["Tab hopper, huh? Happiness denied!","You deserted at {n} clicks. Tragic.","Ran away at {n}. The smiley remembers."]
};
function taunt(reason,n){ const pool=TAUNTS[reason]||["GAME OVER."]; return pool[Math.floor(Math.random()*pool.length)].replace("{n}", String(n??0)); }
function storeGameOver(reason){ localStorage.setItem(KO_KEY, JSON.stringify({reason, atClicks:getCount(), atTime:Date.now()})); }
function showOverlay(reason){
  dead = true;
  const ov=document.getElementById("overlay"); const msg=document.getElementById("overlay-msg"); const btn=document.getElementById("overlay-retry");
  if (msg) msg.textContent = taunt(reason, getCount());
  if (ov) ov.classList.add("show");
  const clicker=document.getElementById("clicker");
  if (clicker){ clicker.setAttribute("disabled","true"); clicker.style.opacity=.6; clicker.style.pointerEvents="none"; }
  if (btn){ btn.onclick = ()=>{ sessionStorage.setItem(RETRY_FLAG,"1"); localStorage.removeItem(KO_KEY); resetAll(true); }; }
}

/* ---------- reset ---------- */
function resetAll(reload=true){
  localStorage.removeItem(KEY);
  chaosRunning=false; halloweenMode=false; dead=false;
  clearTimeout(chaosTimer); clearTimeout(inactivityTimer);
  document.body.classList.remove("halloween");
  const face=document.getElementById("face"); if (face){ face.classList.remove("visible","roll","grow","flash"); face.textContent="😊"; face.style.transform="translate(20vw,30vh)"; }
  const ov=document.getElementById("overlay"); if (ov) ov.classList.remove("show");
  if (reload) location.href="/";
}

/* ---------- inactivity ---------- */
function restartInactivityTimer(){ clearTimeout(inactivityTimer); inactivityTimer=setTimeout(()=>{ storeGameOver("inactivity"); showOverlay("inactivity"); }, INACT_MS); }

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
   // Start button: clear any old KO, mark game started, reveal game area
    document.getElementById("startBtn").addEventListener("click", () => {
      // flags & storage keys used by script.js:
      sessionStorage.setItem("game_started", "1");         // enable KO logic after start
      sessionStorage.setItem("smiley_retrying", "1");      // avoid "refresh KO" during reveal
      localStorage.removeItem("smiley_last_gameover");     // clear any stale KO from earlier
      localStorage.removeItem("smiley_click_count_v1");    // fresh run

      // show game, hide landing/cards, swap background
      document.body.classList.remove("starting");
      document.getElementById("landing").style.display = "none";
      document.getElementById("cards").style.display = "none";
      document.getElementById("gameArea").style.display = "block";

      // initialize counter display
      if (window.setCount) setCount(0);
      const btn = document.getElementById("clicker");
      if (btn) btn.focus();
    });
  const started = sessionStorage.getItem("game_started")==="1";

  // Only auto-taunt if the player previously started the game
  if (started && sessionStorage.getItem(RETRY_FLAG)!=="1"){
    const koRaw = localStorage.getItem(KO_KEY);
    if (koRaw){ try{ const {reason}=JSON.parse(koRaw); showOverlay(reason||"refresh"); }catch{} }
  } else {
    // clear retry flag when we actually load the game clean
    sessionStorage.removeItem(RETRY_FLAG);
  }

  // Fresh display; actual run begins after Start button shows the game
  localStorage.removeItem(KEY);
  setCount(0);

  const clicker=document.getElementById("clicker");
  if (clicker) clicker.addEventListener("click", bump);
  window.face=document.getElementById("face");

  // R to reset
  window.addEventListener("keydown", e=>{ if (e.key.toLowerCase()==="r") resetAll(true); });

  // Mark KO if player leaves mid-run (only after started)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !dead && sessionStorage.getItem("game_started")==="1"){
      storeGameOver("leave"); localStorage.removeItem(KEY);
    }
  });
  window.addEventListener("beforeunload", () => {
    if (sessionStorage.getItem(RETRY_FLAG)==="1") { localStorage.removeItem(KO_KEY); return; }
    if (!dead && sessionStorage.getItem("game_started")==="1"){ storeGameOver("refresh"); localStorage.removeItem(KEY); }
  });
});

/* ---------- milestones ---------- */
function checkMilestones(n){
  const body=document.body, face=window.face;
  if (n>=300 && n<550){ face&&face.classList.add("visible"); if(!chaosRunning){ chaosRunning=true; startFaceChaos(); } }
  else { face&&face.classList.remove("visible"); }
  if (n>=550 && !halloweenMode){ chaosRunning=false; body.classList.add("halloween"); halloweenMode=true; }
}

/* ---------- face chaos ---------- */
function startFaceChaos(){
  const face=document.getElementById("face"); const faces={normal:"😊", wink:"😉", skull:"💀"}; let pos={x:0.2,y:0.3};
  function moveRandom(){ pos.x=clamp01(pos.x+randRange(-0.35,0.35)); pos.y=clamp01(pos.y+randRange(-0.35,0.35));
    const x=lerp(0.1,0.9,pos.x)*window.innerWidth, y=lerp(0.1,0.8,pos.y)*window.innerHeight; face.style.transform=`translate(${x}px, ${y}px)`; }
  function doEffect(){ const r=Math.random();
    if(r<0.25){ face.classList.add("roll","flash"); setTimeout(()=>face.classList.remove("roll","flash"),1100); }
    else if(r<0.5){ face.textContent=faces.wink; face.classList.add("flash"); setTimeout(()=>{face.textContent=faces.normal; face.classList.remove("flash");},500); }
    else if(r<0.75){ face.classList.add("grow","flash"); setTimeout(()=>face.classList.remove("grow","flash"),600); }
    else { face.textContent=faces.skull; face.classList.add("flash"); setTimeout(()=>{face.textContent=faces.normal; face.classList.remove("flash");},800); } }
  function loop(){ if(!chaosRunning || halloweenMode || dead) return; moveRandom(); doEffect(); chaosTimer=setTimeout(loop, randRange(900,1800)); }
  clearTimeout(chaosTimer); loop();
}

/* ---------- helpers ---------- */
function clamp01(n){ return Math.min(1, Math.max(0, n)); }
function lerp(a,b,t){ return a + (b-a)*t; }
function randRange(min,max){ return Math.random()*(max-min)+min; }
