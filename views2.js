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

/* ---------------- CONTAINERS ---------------- */
const trendingContainer = document.getElementById("trendingVideos");
const normalContainer = document.getElementById("normalVideos");
const videoElements = {};

/* ---------------- CACHE ---------------- */
function saveCache(key, value) { localStorage.setItem(key, value); }
function getCache(key) { return localStorage.getItem(key); }

/* ---------------- UTILITIES ---------------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(".0", "") + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(".0", "") + "K";
  return num;
}
document.getElementById("folderTitle").textContent = folderName ? toTitleCase(folderName) : "🔐 VIP Exclusive";

/* ---------------- VIDEO INTERACTIONS ---------------- */
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

/* ---------------- SKELETON LOADER ---------------- */
function createSkeleton() {
  const box = document.createElement("div");
  box.className = "videoBox skeleton";

  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";
  box.appendChild(wrapper);

  const title = document.createElement("div");
  title.className = "videoTitle";
  box.appendChild(title);

  const views = document.createElement("div");
  views.className = "views";
  box.appendChild(views);

  const btn = document.createElement("div");
  btn.className = "download";
  box.appendChild(btn);

  return box;
}

/* Show 3 skeletons immediately */
for (let i = 0; i < 3; i++) {
  normalContainer.appendChild(createSkeleton());
}

/* ---------------- CREATE VIDEO BOX ---------------- */
function createVideoBox(videoData) {
  const box = document.createElement("div");
  box.className = "videoBox";

  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";

  const thumb = document.createElement("img");
  thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(videoData.thumbnail)}`;
  thumb.onclick = () => {
    increaseViews(videoData.id);
    const iframe = document.createElement("iframe");
    iframe.src = videoData.embed;
    iframe.allowFullscreen = true;
    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);
  };
  wrapper.appendChild(thumb);

  const title = document.createElement("h3");
  title.className = "videoTitle";
  title.textContent = videoData.title;
  title.onclick = () => {
    increaseViews(videoData.id);
    window.open(videoData.url, "_blank");
  };

  const views = document.createElement("div");
  views.className = "views";
  const cachedViews = getCache("views_" + videoData.id);
  const cachedCycle = getCache("cycle_" + videoData.id);
  let initialViews = cachedViews ? Number(cachedViews) : 0;
  let initialCycle = cachedCycle ? Number(cachedCycle) : 0;
  views.textContent = `👁 ${formatViews(initialViews)}`;

  const btn = document.createElement("a");
  btn.className = "download";
  btn.href = "#";
  btn.textContent = `Download (${videoData.size || "?"})`;
  btn.onclick = e => {
    e.preventDefault();
    increaseViews(videoData.id);
    window.open(videoData.url, "_blank");
  };

  box.appendChild(wrapper);
  box.appendChild(title);
  box.appendChild(views);
  box.appendChild(btn);

  /* STORE ELEMENT */
  videoElements[videoData.id] = {
    box,
    views,
    totalViews: initialViews,
    cycleViews: initialCycle
  };

  /* FIREBASE LISTENERS */
  onValue(ref(db, "views/" + videoData.id), snap => {
    videoElements[videoData.id].totalViews = snap.val() || 0;
    updateUI(videoData.id);
  });
  onValue(ref(db, "cycleViews/" + videoData.id), snap => {
    videoElements[videoData.id].cycleViews = Number(snap.val()) || 0;
    updateUI(videoData.id);
  });

  return box;
}

/* ---------------- UPDATE UI ---------------- */
function updateUI(id) {
  const v = videoElements[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, cycle);

  const isTrending = cycle >= 10;
  const target = isTrending ? trendingContainer : normalContainer;

  if (v.box.parentElement !== target) {
    if (isTrending) target.insertBefore(v.box, target.firstChild);
    else target.appendChild(v.box);
  }

  const newText = isTrending ? `🔥 Trending | 👁 ${formatViews(total)}` : `👁 ${formatViews(total)}`;
  if (v.views.textContent !== newText) {
    v.views.textContent = newText;
    v.views.style.color = isTrending ? "#ffcc00" : "#aaa";
  }
}

/* ---------------- LOAD VIDEOS ---------------- */
fetch(dataSource)
  .then(res => res.json())
  .then(videos => {
    normalContainer.innerHTML = ""; // remove skeletons

    const filtered = folderName
      ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
      : videos;

    filtered.forEach(videoData => {
      const box = createVideoBox(videoData);
      normalContainer.appendChild(box);
    });
  })
  .catch(err => {
    console.error("Failed to load videos:", err);
  });
