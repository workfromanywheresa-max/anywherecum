import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...", 
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

/* ---------------- CONFIG ---------------- */
const TEST_MODE = localStorage.getItem("testMode") === "true";
const config = window.VIDEO_CONFIG || {};
const folderName = (config.folder || "").toLowerCase();
const dataSource = config.dataSource || "videos.json";

/* ---------------- UTILS ---------------- */
function saveCache(key, value) { localStorage.setItem(key, value); }
function getCache(key) { return localStorage.getItem(key); }
function toTitleCase(str) {
  return str.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(".0","") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(".0","") + "K";
  return num;
}
function increaseViews(videoId) {
  if (TEST_MODE) return;
  fetch("https://anywherecum.workfromanywhere-sa.workers.dev/increment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId })
  }).catch(console.error);
}

/* ---------------- ELEMENTS ---------------- */
const trendingContainer = document.getElementById("trendingVideos");
const normalContainer = document.getElementById("normalVideos");
const videoElements = {};

/* ---------------- TITLE ---------------- */
if (folderName) {
  document.getElementById("folderTitle").textContent = toTitleCase(folderName);
} else {
  document.getElementById("folderTitle").textContent = "🔐VIP Exclusive";
}

/* ---------------- DYNAMIC SKELETONS ---------------- */
function showSkeletons(container, count) {
  container.innerHTML = "";
  for (let i=0;i<count;i++){
    const box = document.createElement("div");
    box.className="videoBox";
    const skeleton = document.createElement("div");
    skeleton.className="skeleton";
    box.appendChild(skeleton);
    container.appendChild(box);
  }
}

/* ---------------- UPDATE UI ---------------- */
function updateUI(id){
  const v = videoElements[id]; if(!v) return;
  const total = v.totalViews||0;
  const cycle = v.cycleViews||0;
  saveCache("views_"+id, total);
  saveCache("cycle_"+id, cycle);
  const isTrending = cycle>=10;
  const target = isTrending?trendingContainer:normalContainer;
  if(v.box.parentElement!==target){
    isTrending?target.insertBefore(v.box,target.firstChild):target.appendChild(v.box);
  }
  const newText = isTrending?`🔥 Trending | 👁 ${formatViews(total)}`:`👁 ${formatViews(total)}`;
  if(v.views.textContent!==newText){
    v.views.textContent=newText;
    v.views.style.color=isTrending?"#ffcc00":"#aaa";
  }
}

/* ---------------- LOAD VIDEOS ---------------- */
fetch(dataSource).then(r=>r.json()).then(videos=>{
  const filtered = folderName ? videos.filter(v=>v.folder?.toLowerCase()===folderName) : videos;
  if(!filtered.length) return;

  // Inject skeletons dynamically
  const trendingSkeletons = filtered.filter(v=>(Number(getCache("cycle_"+v.id))||0)>=10);
  const normalSkeletons = filtered.filter(v=>(Number(getCache("cycle_"+v.id))||0)<10);
  if(trendingSkeletons.length) showSkeletons(trendingContainer, trendingSkeletons.length);
  if(normalSkeletons.length) showSkeletons(normalContainer, normalSkeletons.length);

  filtered.forEach(v=>{
    const box=document.createElement("div"); box.className="videoBox";
    const wrapper=document.createElement("div"); wrapper.className="videoFrameWrapper";
    const thumb=document.createElement("img"); thumb.src=`https://anywherecum.pages.dev/images/${encodeURIComponent(v.thumbnail)}`;
    thumb.onclick=()=>{
      increaseViews(v.id);
      const iframe=document.createElement("iframe");
      iframe.src=v.embed; iframe.allowFullscreen=true;
      wrapper.innerHTML=""; wrapper.appendChild(iframe);
    };
    wrapper.appendChild(thumb);

    const title=document.createElement("h3"); title.className="videoTitle"; title.textContent=v.title;
    title.onclick=()=>{increaseViews(v.id); window.open(v.url,"_blank");};

    const views=document.createElement("div"); views.className="views";
    const cachedViews=getCache("views_"+v.id);
    views.textContent=`👁 ${formatViews(cachedViews?Number(cachedViews):0)}`;

    const btn=document.createElement("a"); btn.className="download"; btn.href="#"; btn.textContent=`Download (${v.size||"?"})`;
    btn.onclick=(e)=>{e.preventDefault(); increaseViews(v.id); window.open(v.url,"_blank");};

    box.appendChild(wrapper); box.appendChild(title); box.appendChild(views); box.appendChild(btn);

    const isTrending=(Number(getCache("cycle_"+v.id))||0)>=10;
    const target=isTrending?trendingContainer:normalContainer;
    const skeleton=target.querySelector(".videoBox");
    if(skeleton) target.replaceChild(box,skeleton); else target.appendChild(box);

    videoElements[v.id]={box,views,totalViews:cachedViews?Number(cachedViews):0,cycleViews:Number(getCache("cycle_"+v.id))||0};

    onValue(ref(db,"views/"+v.id),snap=>{videoElements[v.id].totalViews=snap.val()||0; updateUI(v.id);});
    onValue(ref(db,"cycleViews/"+v.id),snap=>{videoElements[v.id].cycleViews=Number(snap.val())||0; updateUI(v.id);});
  });
});
