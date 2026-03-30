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
  if (!num || isNaN(num)) return "1"; // prevent 0 flash
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0","") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0","") + "K";
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
  spinner.style.border = "4px solid rgba(255,255,255,0.3)";
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

const style = document.createElement("style");
style.innerHTML = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;
document.head.appendChild(style);

/* ---------------- VIDEO BOX ---------------- */
function createVideoBox(video) {
  const box = document.createElement("div");
  box.className = "videoBox";
  box.style.height = `${videoBoxHeight + 60}px`;

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
  views.className = "views";
  views.textContent = `👁 ${formatViews(video.totalViews)}`;

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

  const newText = isTrending
    ? `🔥 Trending | 👁 ${formatViews(total)}`
    : `👁 ${formatViews(total)}`;

  if (v.views.textContent !== newText) {
    v.views.textContent = newText;
    v.views.style.color = isTrending ? "#ffcc00" : "#aaa";
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

      // ✅ load cache FIRST
      const cachedViews = getCache("views_" + v.id);
      const cachedCycle = getCache("cycle_" + v.id);

      videoElements[v.id] = {
        box,
        views: box.querySelector(".views"),
        totalViews: cachedViews !== null ? Number(cachedViews) : (v.totalViews || 0),
        cycleViews: cachedCycle !== null ? Number(cachedCycle) : (v.cycleViews || 0),
        originalIndex: index
      };

      // ✅ FIREBASE (override cache safely)
      onValue(ref(db, "views/" + v.id), snap => {
        const val = snap.val();
        if (val !== null && val !== undefined) {
          videoElements[v.id].totalViews = Number(val);
          saveCache("views_" + v.id, val);
          updateUI(v.id);
        }
      });

      onValue(ref(db, "cycleViews/" + v.id), snap => {
        const val = snap.val();
        if (val !== null && val !== undefined) {
          videoElements[v.id].cycleViews = Number(val);
          saveCache("cycle_" + v.id, val);
          updateUI(v.id);
        }
      });
    });

    setTimeout(() => {
      Object.keys(videoElements).forEach(id => updateUI(id));
    }, 50);
  })
  .catch(err => {
    console.error("Error loading videos:", err);
    removeLoader();
  });
