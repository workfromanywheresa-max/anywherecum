import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...", // your key
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

/* ---------------- CONFIG ---------------- */
const TEST_MODE = localStorage.getItem("testMode") === "true";
const config = window.VIDEO_CONFIG || {};
const folderName = (config.folder || "").toLowerCase();
const dataSource = config.dataSource || "videos.json";

/* ---------------- CACHE ---------------- */
const saveCache = (key, value) => localStorage.setItem(key, value);
const getCache = key => localStorage.getItem(key);

/* ---------------- TITLE ---------------- */
document.getElementById("folderTitle").textContent =
  folderName ? folderName.replace(/\b\w/g, c => c.toUpperCase()) : "🔐VIP Exclusive";

/* ---------------- FORMAT VIEWS ---------------- */
function formatViews(num) {
  num = Number(num) || 0;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0","") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0","") + "K";
  return num;
}

/* ---------------- VIEW INCREMENT ---------------- */
async function sendToWorker(videoId) {
  try {
    await fetch("https://anywherecum.workfromanywhere-sa.workers.dev/increment", {
      method:"POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId })
    });
  } catch(err){ console.error("Worker failed:", err); }
}

function increaseViews(videoId) {
  if(!TEST_MODE) sendToWorker("clicked_" + videoId);
}

/* ---------------- CONTAINERS ---------------- */
const trendingContainer = document.getElementById("trendingVideos");
const normalContainer = document.getElementById("normalVideos");
const videoElements = {};

/* ---------------- UI UPDATE ---------------- */
function updateUI(id){
  const v = videoElements[id];
  if(!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, cycle);

  const isTrending = cycle >= 10;
  const target = isTrending && trendingContainer ? trendingContainer : normalContainer;

  if(v.box.parentElement !== target){
    target.insertBefore(v.box, target.firstChild);
  }

  const newText = isTrending ? `🔥 Trending | 👁 ${formatViews(total)}` : `👁 ${formatViews(total)}`;
  if(v.views.textContent !== newText){
    v.views.textContent = newText;
    v.views.style.color = isTrending ? "#ffcc00" : "#aaa";
  }
}

/* ---------------- LOAD VIDEOS ---------------- */
document.addEventListener("DOMContentLoaded", ()=>{
  fetch(dataSource)
    .then(res => res.json())
    .then(videos => {

      const filtered = folderName
        ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
        : videos;

      // remove skeletons
      normalContainer.querySelectorAll(".videoBox.skeleton").forEach(s => s.remove());

      filtered.forEach(v => {
        const box = document.createElement("div");
        box.className="videoBox";
        box.style.opacity="0";
        box.style.transform="translateY(10px)";
        box.style.transition="opacity 0.3s ease, transform 0.3s ease";

        const wrapper = document.createElement("div");
        wrapper.className="videoFrameWrapper";
        const thumb = document.createElement("img");
        thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(v.thumbnail)}`;
        thumb.style.cursor="pointer";
        thumb.onclick = ()=>{
          increaseViews(v.id);
          const iframe = document.createElement("iframe");
          iframe.src=v.embed;
          iframe.allowFullscreen=true;
          wrapper.innerHTML="";
          wrapper.appendChild(iframe);
        };
        wrapper.appendChild(thumb);

        const title=document.createElement("h3");
        title.className="videoTitle";
        title.textContent=v.title;
        title.onclick=()=>{ increaseViews(v.id); window.open(v.url,"_blank"); };

        const views=document.createElement("div");
        views.className="views";
        const cachedViews = getCache("views_" + v.id);
        views.textContent=`👁 ${formatViews(cachedViews)}`;

        const btn=document.createElement("a");
        btn.className="download";
        btn.href=v.url;
        btn.textContent=`Download (${v.size || "?"})`;
        btn.onclick=e=>{ e.preventDefault(); increaseViews(v.id); window.open(v.url,"_blank"); };

        box.append(wrapper,title,views,btn);
        normalContainer.appendChild(box);

        requestAnimationFrame(()=>{
          box.style.opacity="1";
          box.style.transform="translateY(0)";
        });

        videoElements[v.id]={ box, views, totalViews: Number(cachedViews)||0, cycleViews: 0 };

        // Firebase updates
        onValue(ref(db,"views/"+v.id),snap=>{
          videoElements[v.id].totalViews=snap.val()||0;
          updateUI(v.id);
        });
        onValue(ref(db,"cycleViews/"+v.id),snap=>{
          videoElements[v.id].cycleViews=Number(snap.val())||0;
          updateUI(v.id);
        });
      });
    })
    .catch(err=>console.error("Failed to load videos:",err));
});
