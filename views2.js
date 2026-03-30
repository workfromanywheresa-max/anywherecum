import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

/* ---------------- TEST MODE ---------------- */
const TEST_MODE = localStorage.getItem("testMode") === "true";

/* ---------------- CONFIG ---------------- */
const config = window.VIDEO_CONFIG || {};
const folderName = (config.folder || "").toLowerCase();
const dataSource = config.dataSource || "vip.json";

/* ---------------- CACHE ---------------- */
const saveCache = (key, value) => localStorage.setItem(key, value);
const getCache = (key) => localStorage.getItem(key);

/* ---------------- TITLE ---------------- */
const folderTitle = document.getElementById("folderTitle");
folderTitle.textContent = folderName
  ? folderName.split(" ").map(w => w[0].toUpperCase()+w.slice(1)).join(" ")
  : "🔐 VIP Exclusive";

/* ---------------- FORMAT ---------------- */
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num/1_000_000).toFixed(1).replace(".0","") + "M";
  if (num >= 1_000) return (num/1_000).toFixed(1).replace(".0","") + "K";
  return num;
}

/* ---------------- WORKER ---------------- */
async function sendToWorker(videoId) {
  try {
    await fetch("https://anywherecum.workfromanywhere-sa.workers.dev/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId })
    });
  } catch(e) { console.error("Worker failed:", e); }
}
function increaseViews(videoId) { if(!TEST_MODE) sendToWorker("clicked_" + videoId); }

/* ---------------- CONTAINER ---------------- */
const container = document.getElementById("normalVideos");
const videoElements = {};

/* ---------------- UI UPDATE ---------------- */
function updateUI(id) {
  const v = videoElements[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, cycle);

  const isTrending = cycle >= 10;

  // Move trending videos to top
  if (v.box.parentElement !== container) container.appendChild(v.box); // ensure it's inside
  if (isTrending) container.insertBefore(v.box, container.firstChild);

  // Update views display
  v.views.textContent = `${isTrending ? "🔥 " : ""}👁 ${formatViews(total)}`;
  v.views.style.color = isTrending ? "#ffcc00" : "#aaa";
}

/* ---------------- LOAD VIDEOS ---------------- */
fetch(dataSource)
  .then(res => res.json())
  .then(videos => {

    const filtered = folderName
      ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
      : videos;

    filtered.forEach(v => {
      const box = document.createElement("div");
      box.className = "videoBox";

      const wrapper = document.createElement("div");
      wrapper.className = "videoFrameWrapper";

      const thumb = document.createElement("img");
      thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(v.thumbnail)}`;
      thumb.onclick = () => {
        increaseViews(v.id);
        wrapper.innerHTML = "";
        const iframe = document.createElement("iframe");
        iframe.src = v.embed;
        iframe.allowFullscreen = true;
        wrapper.appendChild(iframe);
      };
      wrapper.appendChild(thumb);

      const title = document.createElement("h3");
      title.className = "videoTitle";
      title.textContent = v.title;
      title.onclick = () => { increaseViews(v.id); window.open(v.url, "_blank"); };

      const views = document.createElement("div");
      views.className = "views";
      views.textContent = `👁 ${formatViews(getCache("views_" + v.id) || 0)}`;

      const btn = document.createElement("a");
      btn.className = "download";
      btn.href = "#";
      btn.textContent = `Download (${v.size || "?"})`;
      btn.onclick = (e) => { e.preventDefault(); increaseViews(v.id); window.open(v.url, "_blank"); };

      box.appendChild(wrapper);
      box.appendChild(title);
      box.appendChild(views);
      box.appendChild(btn);

      container.appendChild(box);

      videoElements[v.id] = {
        box,
        views,
        totalViews: Number(getCache("views_" + v.id) || 0),
        cycleViews: Number(getCache("cycle_" + v.id) || 0)
      };

      /* Firebase listeners */
      onValue(ref(db, "views/" + v.id), snap => {
        videoElements[v.id].totalViews = snap.val() || 0;
        updateUI(v.id);
      });

      onValue(ref(db, "cycleViews/" + v.id), snap => {
        videoElements[v.id].cycleViews = Number(snap.val()) || 0;
        updateUI(v.id);
      });
    });
});
