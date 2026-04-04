import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js"; import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */ const app = initializeApp({ apiKey: "AIzaSyCEX...", databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com" }); const db = getDatabase(app);

/* ---------------- TEST MODE ---------------- */ const TEST_MODE = localStorage.getItem("testMode") === "true";

/* ---------------- VISIT TRACKING (FIXED) ---------------- */ const VISIT_ID_KEY = "visit_id";

let visitId = localStorage.getItem(VISIT_ID_KEY);

if (!visitId) { visitId = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9); localStorage.setItem(VISIT_ID_KEY, visitId); }

/* ---------------- CONFIG ---------------- */ const urlParams = new URLSearchParams(window.location.search); const folderName = (urlParams.get("folder") || "").trim().toLowerCase(); const config = window.VIDEO_CONFIG || {}; const dataSource = config.dataSource || "videos.json";

/* ---------------- CACHE ---------------- */ const cache = {}; const ORDER_KEY = "video_order";

function saveCache(key, value) { cache[key] = value; localStorage.setItem(key, value); } function getCache(key) { return cache[key] || localStorage.getItem(key); }

/* ---------------- STATE ---------------- */ const videoDataMap = {}; const videoElements = {}; let currentPreviewVideo = null;

/* ---------------- STOP FUNCTION ---------------- */ function stopVideo(videoEl) { if (!videoEl) return; videoEl.pause(); videoEl.currentTime = 0; }

/* ---------------- AUTO STOP WHEN OUT OF VIEW ---------------- */ const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { const video = entry.target; if (!entry.isIntersecting) { stopVideo(video); if (currentPreviewVideo === video) currentPreviewVideo = null; } }); }, { threshold: 0.25 });

/* ---------------- TITLE ---------------- */ function toTitleCase(str) { return str.toLowerCase().split(" ") .map(w => w.charAt(0).toUpperCase() + w.slice(1)) .join(" "); }

const titleEl = document.getElementById("folderTitle"); if (titleEl) { titleEl.textContent = folderName ? toTitleCase(folderName) : "All Videos"; }

/* ---------------- FORMAT ---------------- */ function formatViews(num) { num = Number(num); if (isNaN(num)) return "0"; if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M"; if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K"; return num; }

/* ---------------- WORKER ---------------- */ async function sendToWorker(videoId) { try { await fetch("https://anywherecum.workfromanywhere-sa.workers.dev/increment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoId }) }); } catch (err) { console.error("Worker failed:", err); } }

function increaseViews(videoId) { if (!TEST_MODE) sendToWorker("clicked_" + videoId); }

/* ---------------- COUNT ONCE ---------------- */ function countWatchOnce(videoId) { const key = ${visitId}_watch_${videoId}; if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); increaseViews(videoId); }

function countDownloadOnce(videoId) { const key = ${visitId}_download_${videoId}; if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); increaseViews(videoId); }

/* ---------------- UI UPDATE (TRENDING LOGIC) ---------------- */ function updateUI(id) { const v = videoDataMap[id]; if (!v || !videoElements[id]) return;

const total = v.totalViews || 0; const isTrending = v.cycleViews >= 10;

saveCache("views_" + id, total); saveCache("cycle_" + id, v.cycleViews);

const text = isTrending ? 🔥 Trending | 👁 ${formatViews(total)} : 👁 ${formatViews(total)};

const el = videoElements[id].views;

if (el.textContent !== text) { requestAnimationFrame(() => { el.textContent = text; el.style.color = isTrending ? "#ffcc00" : "#fff"; }); } }

/* ---------------- REORDER (TRENDING FIRST) ---------------- */ function reorderVideos(force = false) { const entries = Object.entries(videoDataMap);

entries.sort((a, b) => { const A = a[1]; const B = b[1];

const ATrending = A.cycleViews >= 10;
const BTrending = B.cycleViews >= 10;

if (ATrending && !BTrending) return -1;
if (!ATrending && BTrending) return 1;

if (ATrending && BTrending) {
  return B.cycleViews - A.cycleViews;
}

return A.originalIndex - B.originalIndex;

});

const newOrder = entries.map(([id]) => id); const oldOrder = JSON.parse(getCache(ORDER_KEY) || "[]");

if (!force && JSON.stringify(newOrder) === JSON.stringify(oldOrder)) return;

saveCache(ORDER_KEY, JSON.stringify(newOrder));

newOrder.forEach(id => { const el = videoElements[id]?.box; if (el) videosContainer.appendChild(el); }); }

/* ---------------- CONTAINER ---------------- */ const videosContainer = document.getElementById("normalVideos");

/* ---------------- VIDEO BOX ---------------- */ function createVideoBox(video) {

const box = document.createElement("div"); box.className = "videoBox";

const wrapper = document.createElement("div"); wrapper.className = "videoFrameWrapper"; wrapper.style.position = "relative";

const defaultQuality = video.qualities.find(q => q.label.includes("480")) || video.qualities[0];

let currentEmbed = defaultQuality.embed;

function loadPlayer() { if (wrapper.dataset.loaded === "true") return; wrapper.dataset.loaded = "true";

const iframe = document.createElement("iframe");
iframe.src = currentEmbed;
iframe.allowFullscreen = true;

wrapper.replaceChildren(iframe);

}

const preview = document.createElement("video"); preview.src = video.preview; preview.muted = true; preview.loop = true; preview.playsInline = true; preview.preload = "metadata"; preview.style.width = "100%"; preview.style.height = "100%"; preview.style.objectFit = "cover";

observer.observe(preview);

preview.onclick = () => { countWatchOnce(video.id); loadPlayer(); };

let startX = 0;

preview.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });

preview.addEventListener("touchend", e => { const endX = e.changedTouches[0].clientX; const diff = Math.abs(endX - startX);

if (diff > 30) {
  if (currentPreviewVideo && currentPreviewVideo !== preview) {
    stopVideo(currentPreviewVideo);
  }

  if (preview.paused) {
    preview.play().catch(() => {});
    currentPreviewVideo = preview;
  } else {
    stopVideo(preview);
  }
}

});

wrapper.appendChild(preview);

const views = document.createElement("div"); views.className = "views"; views.style.position = "absolute"; views.style.bottom = "8px"; views.style.left = "8px"; views.style.background = "rgba(0,0,0,0.6)"; views.style.padding = "4px 8px"; views.style.borderRadius = "6px"; views.style.fontSize = "12px";

wrapper.appendChild(views);

const select = document.createElement("select");

video.qualities.forEach((q, index) => { const option = document.createElement("option"); option.value = index; option.textContent = Stream - ${q.label}; if (q === defaultQuality) option.selected = true; select.appendChild(option); });

select.onchange = () => { const selected = video.qualities[select.value]; currentEmbed = selected.embed; countWatchOnce(video.id); wrapper.dataset.loaded = "false"; loadPlayer(); };

const title = document.createElement("h3"); title.className = "videoTitle"; title.textContent = video.title;

const downloadBtn = document.createElement("button"); downloadBtn.textContent = "Download";

const downloadBox = document.createElement("div"); downloadBox.style.display = "none";

downloadBtn.onclick = () => { downloadBox.style.display = downloadBox.style.display === "none" ? "block" : "none"; countDownloadOnce(video.id); };

video.qualities.forEach(q => { const link = document.createElement("a"); link.href = q.download; link.target = "_blank"; link.textContent = ${q.label} • ${q.size}; link.style.display = "block"; link.style.color = "#ff4444"; link.onclick = () => countDownloadOnce(video.id); downloadBox.appendChild(link); });

box.appendChild(select); box.appendChild(wrapper); box.appendChild(title); box.appendChild(downloadBtn); box.appendChild(downloadBox);

return box; }

/* ---------------- LOAD ---------------- */ createLoader();

fetch(dataSource) .then(res => res.json()) .then(videos => {

removeLoader();

const filtered = folderName
  ? videos.filter(v =>
      (v.folder || "").trim().toLowerCase() === folderName
    )
  : videos;

filtered.forEach((v, index) => {

  videoDataMap[v.id] = {
    ...v,
    originalIndex: index,
    totalViews: Number(getCache("views_" + v.id)) || v.totalViews || 0,
    cycleViews: Number(getCache("cycle_" + v.id)) || v.cycleViews || 0
  };

  const box = createVideoBox(v);
  videosContainer.appendChild(box);

  videoElements[v.id] = {
    box,
    views: box.querySelector(".views")
  };

  updateUI(v.id);
});

reorderVideos(true);

/* FIREBASE */
filtered.forEach(v => {

  onValue(ref(db, "views/" + v.id), snap => {
    const val = snap.val();
    if (val !== null) {
      videoDataMap[v.id].totalViews = val;
      updateUI(v.id);
    }
  });

  onValue(ref(db, "cycleViews/" + v.id), snap => {
    const val = snap.val();
    if (val !== null) {
      videoDataMap[v.id].cycleViews = Number(val);
      updateUI(v.id);
      reorderVideos();
    }
  });

});

}) .catch(err => console.error(err));

/* STOP when tab hidden */ document.addEventListener("visibilitychange", () => { if (document.hidden && currentPreviewVideo) { stopVideo(currentPreviewVideo); currentPreviewVideo = null; } });
