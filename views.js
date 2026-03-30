import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- Firebase ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWH6oNqPpppR4kx0",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ================= SUBSCRIBER WORKER ================= */
const SUBSCRIBER_WORKER = "https://anywherecumnotifications.workfromanywhere-sa.workers.dev/subscriber";

window.saveSubscriber = async function(userId, optedIn) {
  try {
    if (!userId) return;
    await fetch(SUBSCRIBER_WORKER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, subscribed: optedIn ? 1 : 0 })
    });
  } catch (err) {
    console.error("Subscriber Worker failed:", err);
  }
};

/* ---------------- Worker ---------------- */
const WORKER_URL = "https://anywherecum.workfromanywhere-sa.workers.dev/increment";
async function sendToWorker(type) {
  try {
    await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
  } catch (err) { console.error("Worker tracking failed:", err); }
}

/* ---------------- Page Detection ---------------- */
let path = window.location.pathname.toLowerCase();
let pageName = (path === "/" || path === "/index.html") ? "home" : path.split("/").filter(Boolean).pop().replace(".html","");

/* ---------------- Track Page ---------------- */
function trackPage(page) {
  const key = "page_" + page;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key,"1");
  sendToWorker(page);
}
trackPage(pageName);

/* ---------------- Preview Click Tracking ---------------- */
window.trackPreviewClick = function(folderName) {
  const key = "preview_" + folderName;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key,"1");
  sendToWorker(folderName);
};

/* ---------------- Detect Clicks ---------------- */
document.addEventListener("click", function(e) {
  const preview = e.target.closest(".folder-preview");
  if (preview) {
    const folderName = preview.getAttribute("data-folder");
    if (folderName) trackPreviewClick(folderName);
  }
});

/* ---------------- Format Views ---------------- */
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num>=1000000) return (num/1000000).toFixed(1).replace(".0","")+"M";
  if (num>=1000) return (num/1000).toFixed(1).replace(".0","")+"K";
  return num;
}

/* ---------------- Cache ---------------- */
function saveCache(key,value){ localStorage.setItem(key,value); }
function getCache(key){ return localStorage.getItem(key); }

/* ---------------- Firebase Views ---------------- */
const pageRef = ref(db,"pageViews");
onValue(pageRef,(snapshot)=>{
  const data = snapshot.val()||{};
  let total = 0;
  Object.values(data).forEach(v=>{ if(typeof v==="number") total+=v; });
  saveCache("totalViews",total);
  saveCache("pageViewsData",JSON.stringify(data));
});

/* ---------------- Load Videos ---------------- */
async function loadVideos(){
  try{
    const res = await fetch("vip.json"); // make sure vip.json exists
    const videos = await res.json();
    const skeletons = document.querySelectorAll('#normalVideos .videoBox.skeleton');

    videos.forEach((video,index)=>{
      let box = skeletons[index];
      if(!box){
        // extra videos
        const container = document.getElementById('normalVideos');
        box = document.createElement('div');
        box.className = "videoBox";
        container.appendChild(box);
      } else {
        box.classList.remove("skeleton");
      }
      box.innerHTML = `
        <div class="videoFrameWrapper">
          <iframe src="${video.url}" allowfullscreen></iframe>
        </div>
        <div class="videoTitle">${video.title}</div>
        <div class="views">${formatViews(video.views)} views</div>
        <a class="download" href="${video.download}">Download</a>
      `;
    });
  }catch(err){
    console.error("Failed to load videos",err);
  }
}

document.addEventListener("DOMContentLoaded", loadVideos);
