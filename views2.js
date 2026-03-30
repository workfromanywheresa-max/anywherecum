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
const dataSource = config.dataSource || "videos.json";

/* ---------------- CACHE ---------------- */
function saveCache(key, value) { localStorage.setItem(key, value); }
function getCache(key) { return localStorage.getItem(key); }

/* ---------------- TITLE ---------------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
document.getElementById("folderTitle").textContent =
  folderName ? toTitleCase(folderName) : "🔐VIP Exclusive";

/* ---------------- FORMAT ---------------- */
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
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
  } catch (err) { console.error("Worker failed:", err); }
}
function increaseViews(videoId) {
  if (!TEST_MODE) sendToWorker("clicked_" + videoId);
}

/* ---------------- CONTAINER ---------------- */
const videosContainer = document.getElementById("normalVideos");
const videoElements = {};

/* ---------------- LOADER ---------------- */
const videoBoxWidth = 600;
const videoBoxHeight = 169;

function createLoader() {
  const loader = document.createElement("div");
  loader.id = "loader";
  loader.style.position = "fixed";
  loader.style.top = "50%";
  loader.style.left = "50%";
  loader.style.transform = "translate(-50%, -50%)";
  loader.style.zIndex = "9999";
  loader.style.display = "flex";
  loader.style.justifyContent = "center";
  loader.style.alignItems = "center";
  loader.style.width = `${videoBoxWidth}px`;
  loader.style.height = `${videoBoxHeight}px`;

  const spinner = document.createElement("div");
  spinner.style.border = "4px solid rgba(255, 255, 255, 0.3)";
  spinner.style.borderTop = "4px solid #ffcc00";
  spinner.style.borderRadius = "50%";
  spinner.style.width = "50px";
  spinner.style.height = "50px";
  spinner.style.animation = "spin 1s linear infinite";

  loader.appendChild(spinner);
  document.body.appendChild(loader);
}

function removeLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.remove();
}

const style = document.createElement('style');
style.innerHTML = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;
document.head.appendChild(style);

/* ---------------- VIDEO BOX ---------------- */
function createVideoBox(video) {
  const box = document.createElement("div");

  const wrapper = document.createElement("div");
  wrapper.style.width = "100%";
  wrapper.style.maxWidth = `${videoBoxWidth}px`;
  wrapper.style.aspectRatio = "16/9";

  const thumb = document.createElement("img");
  thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(video.thumbnail)}`;

  thumb.onclick = () => {
    increaseViews(video.id);
    const iframe = document.createElement("iframe");
    iframe.src = video.embed;
    iframe.allowFullscreen = true;
    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);
  };

  wrapper.appendChild(thumb);

  const title = document.createElement("h3");
  title.textContent = video.title;
  title.onclick = () => {
    increaseViews(video.id);
    window.open(video.url, "_blank");
  };

  const views = document.createElement("div");

  const btn = document.createElement("a");
  btn.href = "#";
  btn.textContent = `Download (${video.size || "?"})`;
  btn.onclick = (e) => {
    e.preventDefault();
    increaseViews(video.id);
    window.open(video.url, "_blank");
  };

  box.appendChild(wrapper);
  box.appendChild(title);
  box.appendChild(views);
  box.appendChild(btn);

  return box;
}

/* ---------------- UI UPDATE ---------------- */
function updateUI(id) {
  const v = videoElements[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, cycle);

  const isTrending = cycle >= 10;

  v.views.textContent = isTrending
    ? `🔥 Trending | 👁 ${formatViews(total)}`
    : `👁 ${formatViews(total)}`;

  v.views.style.color = isTrending ? "#ffcc00" : "#aaa";

  if (v.box.parentElement === videosContainer) {
    videosContainer.removeChild(v.box);
  }

  if (isTrending) {
    videosContainer.insertBefore(v.box, videosContainer.firstChild);
  } else {
    if (v.originalIndex >= videosContainer.children.length) {
      videosContainer.appendChild(v.box);
    } else {
      videosContainer.insertBefore(v.box, videosContainer.children[v.originalIndex]);
    }
  }
}

/* ---------------- LOAD ---------------- */
createLoader();

fetch(dataSource)
  .then(res => res.json())
  .then(videos => {
    removeLoader();

    const filtered = folderName
      ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
      : videos;

    filtered.forEach((v, index) => {
      const box = createVideoBox(v);
      videosContainer.appendChild(box);

      // 🔥 LOAD FROM CACHE FIRST
      const cachedViews = Number(getCache("views_" + v.id)) || v.totalViews || 0;
      const cachedCycle = Number(getCache("cycle_" + v.id)) || v.cycleViews || 0;

      videoElements[v.id] = {
        box,
        views: box.querySelector("div"),
        totalViews: cachedViews,
        cycleViews: cachedCycle,
        originalIndex: index
      };

      updateUI(v.id);

      // 🔥 FIREBASE SYNC (merge with cache)
      onValue(ref(db, "views/" + v.id), snap => {
        const fb = snap.val() || 0;
        const cached = Number(getCache("views_" + v.id)) || 0;

        videoElements[v.id].totalViews = Math.max(fb, cached);
        updateUI(v.id);
      });

      onValue(ref(db, "cycleViews/" + v.id), snap => {
        const fb = Number(snap.val()) || 0;
        const cached = Number(getCache("cycle_" + v.id)) || 0;

        videoElements[v.id].cycleViews = Math.max(fb, cached);
        updateUI(v.id);
      });
    });
  })
  .catch(error => {
    console.error("Error loading videos:", error);
    removeLoader();
  });
