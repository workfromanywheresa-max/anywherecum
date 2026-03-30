import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...", // Replace with your API key
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

/* ---------------- TEST MODE ---------------- */
const TEST_MODE = localStorage.getItem("testMode") === "true";

/* ---------------- CONFIG ---------------- */
const config = window.VIDEO_CONFIG || {};
const folderName = (config.folder || "").toLowerCase();
const dataSource = config.dataSource || "videos.json";

/* ---------------- CACHE ---------------- */
function saveCache(key, value) {
  localStorage.setItem(key, value);
}
function getCache(key) {
  return localStorage.getItem(key);
}

/* ---------------- TITLE ---------------- */
function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
document.getElementById("folderTitle").textContent = folderName ? toTitleCase(folderName) : "🔐 VIP Exclusive";

/* ---------------- FORMAT VIEWS ---------------- */
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(".0", "") + "K";
  return num;
}

/* ---------------- WORKER ---------------- */
async function sendToWorker(videoId) {
  if (TEST_MODE) return;
  try {
    await fetch("https://anywherecum.workfromanywhere-sa.workers.dev/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId })
    });
  } catch (err) {
    console.error("Worker failed:", err);
  }
}
function increaseViews(videoId) { sendToWorker("clicked_" + videoId); }

/* ---------------- CONTAINERS ---------------- */
const normalContainer = document.getElementById("normalVideos");
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

  // Reorder within normalContainer
  if (v.box.parentElement === normalContainer) normalContainer.removeChild(v.box);
  if (isTrending) {
    normalContainer.insertBefore(v.box, normalContainer.firstChild);
  } else {
    normalContainer.appendChild(v.box);
  }

  // Update views text
  v.views.textContent = `👁 ${formatViews(total)}`;
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
      const placeholder = normalContainer.querySelector(".placeholder");

      const box = document.createElement("div");
      box.className = "videoBox";

      const wrapper = document.createElement("div");
      wrapper.className = "videoFrameWrapper";

      const thumb = document.createElement("img");
      thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(v.thumbnail)}`;
      thumb.onclick = () => {
        increaseViews(v.id);
        const iframe = document.createElement("iframe");
        iframe.src = v.embed;
        iframe.allowFullscreen = true;
        wrapper.innerHTML = "";
        wrapper.appendChild(iframe);
      };
      wrapper.appendChild(thumb);

      const title = document.createElement("h3");
      title.className = "videoTitle";
      title.textContent = v.title;
      title.onclick = () => { increaseViews(v.id); window.open(v.url, "_blank"); };

      const views = document.createElement("div");
      views.className = "views";
      const cachedViews = getCache("views_" + v.id);
      const cachedCycle = getCache("cycle_" + v.id);
      views.textContent = `👁 ${formatViews(cachedViews ? Number(cachedViews) : 0)}`;

      const btn = document.createElement("a");
      btn.className = "download";
      btn.href = "#";
      btn.textContent = `Download (${v.size || "?"})`;
      btn.onclick = e => { e.preventDefault(); increaseViews(v.id); window.open(v.url, "_blank"); };

      box.appendChild(wrapper);
      box.appendChild(title);
      box.appendChild(views);
      box.appendChild(btn);

      // Replace placeholder if exists
      if (placeholder) normalContainer.replaceChild(box, placeholder);
      else normalContainer.appendChild(box);

      videoElements[v.id] = {
        box,
        views,
        totalViews: cachedViews ? Number(cachedViews) : 0,
        cycleViews: cachedCycle ? Number(cachedCycle) : 0
      };

      // Firebase listeners
      onValue(ref(db, "views/" + v.id), snap => { videoElements[v.id].totalViews = snap.val() || 0; updateUI(v.id); });
      onValue(ref(db, "cycleViews/" + v.id), snap => { videoElements[v.id].cycleViews = Number(snap.val()) || 0; updateUI(v.id); });
    });
  });
