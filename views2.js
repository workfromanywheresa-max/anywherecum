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

/* ---------------- VISIT TRACKING ---------------- */
const VISIT_ID_KEY = "visit_id";
let visitId = sessionStorage.getItem(VISIT_ID_KEY);

if (!visitId) {
  visitId = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9);
  sessionStorage.setItem(VISIT_ID_KEY, visitId);
}

const countedVideos = new Set();

/* ---------------- CONFIG ---------------- */
const urlParams = new URLSearchParams(window.location.search);
const folderName = (urlParams.get("folder") || "").trim().toLowerCase();
const config = window.VIDEO_CONFIG || {};
const dataSource = config.dataSource || "videos.json";

/* ---------------- CACHE ---------------- */
const cache = {};
const ORDER_KEY = "video_order";

function saveCache(key, value) {
  cache[key] = value;
  localStorage.setItem(key, value);
}
function getCache(key) {
  return cache[key] || localStorage.getItem(key);
}

/* ---------------- STATE ---------------- */
const videoDataMap = {};
const videoElements = {};
let currentPreviewVideo = null;

/* ---------------- TITLE ---------------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const titleEl = document.getElementById("folderTitle");
if (titleEl) {
  titleEl.textContent = folderName ? toTitleCase(folderName) : "All Videos";
}

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
  } catch (err) {
    console.error("Worker failed:", err);
  }
}

function increaseViews(videoId) {
  if (!TEST_MODE) sendToWorker("clicked_" + videoId);
}

/* ---------------- FIXED: COUNT ONCE PER VISIT ---------------- */
function countWatchOnce(videoId) {
  const key = `${visitId}_watch_${videoId}`;

  if (countedVideos.has(key)) return;

  countedVideos.add(key);
  sessionStorage.setItem(key, "1");

  increaseViews(videoId);
}

function countDownloadOnce(videoId) {
  const key = `${visitId}_download_${videoId}`;

  if (countedVideos.has(key)) return;

  countedVideos.add(key);
  sessionStorage.setItem(key, "1");

  increaseViews(videoId);
}

/* ---------------- CONTAINER ---------------- */
const videosContainer = document.getElementById("normalVideos");

/* ---------------- LOADER ---------------- */
function createLoader() {
  const loader = document.createElement("div");
  loader.id = "loader";
  loader.style.position = "fixed";
  loader.style.top = "50%";
  loader.style.left = "50%";
  loader.style.transform = "translate(-50%, -50%)";
  loader.style.zIndex = "9999";

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

  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";
  wrapper.style.position = "relative";

  const defaultQuality =
    video.qualities.find(q => q.label.includes("480")) ||
    video.qualities[0];

  let currentEmbed = defaultQuality.embed;

  function loadPlayer() {
    if (wrapper.dataset.loaded === "true") return;

    wrapper.dataset.loaded = "true";

    const iframe = document.createElement("iframe");
    iframe.src = currentEmbed;
    iframe.allowFullscreen = true;

    wrapper.replaceChildren(iframe);
  }

  /* -------- PREVIEW -------- */
  const preview = document.createElement("video");
  preview.src = video.preview;
  preview.muted = true;
  preview.loop = true;
  preview.playsInline = true;
  preview.preload = "metadata";
  preview.style.width = "100%";
  preview.style.height = "100%";
  preview.style.objectFit = "cover";

  preview.onclick = () => {
    countWatchOnce(video.id);
    loadPlayer();
  };

  let startX = 0;

  preview.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  preview.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const diff = Math.abs(endX - startX);

    if (diff > 30) {

      if (currentPreviewVideo && currentPreviewVideo !== preview) {
        currentPreviewVideo.pause();
      }

      if (preview.paused) {
        preview.play().catch(() => {});
        currentPreviewVideo = preview;
      } else {
        preview.pause();
      }
    }
  });

  wrapper.appendChild(preview);

  /* -------- VIEWS -------- */
  const views = document.createElement("div");
  views.className = "views";
  views.style.position = "absolute";
  views.style.bottom = "8px";
  views.style.left = "8px";
  views.style.background = "rgba(0,0,0,0.6)";
  views.style.padding = "4px 8px";
  views.style.borderRadius = "6px";
  views.style.fontSize = "12px";

  wrapper.appendChild(views);

  /* -------- QUALITY -------- */
  const select = document.createElement("select");

  video.qualities.forEach((q, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `Stream - ${q.label}`;
    if (q === defaultQuality) option.selected = true;
    select.appendChild(option);
  });

  select.onchange = () => {
    const selected = video.qualities[select.value];
    currentEmbed = selected.embed;

    countWatchOnce(video.id);

    wrapper.dataset.loaded = "false";
    loadPlayer();
  };

  /* -------- TITLE -------- */
  const title = document.createElement("h3");
  title.className = "videoTitle";
  title.textContent = video.title;

  /* -------- DOWNLOAD -------- */
  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Download";

  const downloadBox = document.createElement("div");
  downloadBox.style.display = "none";

  downloadBtn.onclick = () => {
    downloadBox.style.display =
      downloadBox.style.display === "none" ? "block" : "none";

    countDownloadOnce(video.id);
  };

  video.qualities.forEach(q => {
    const link = document.createElement("a");
    link.href = q.download;
    link.target = "_blank";
    link.textContent = `${q.label} • ${q.size}`;
    link.style.display = "block";
    link.style.color = "#ff4444";

    link.onclick = () => countDownloadOnce(video.id);

    downloadBox.appendChild(link);
  });

  box.appendChild(select);
  box.appendChild(wrapper);
  box.appendChild(title);
  box.appendChild(downloadBtn);
  box.appendChild(downloadBox);

  return box;
}

/* ---------------- UI UPDATE ---------------- */
function updateUI(id) {
  const v = videoDataMap[id];
  if (!v || !videoElements[id]) return;

  const total = v.totalViews || 0;
  const isTrending = v.cycleViews >= 10;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, v.cycleViews);

  const text = isTrending
    ? `🔥 Trending | 👁 ${formatViews(total)}`
    : `👁 ${formatViews(total)}`;

  const el = videoElements[id].views;

  if (el.textContent !== text) {
    requestAnimationFrame(() => {
      el.textContent = text;
      el.style.color = isTrending ? "#ffcc00" : "#fff";
    });
  }
}

/* ---------------- REORDER ---------------- */
function reorderVideos(force = false) {
  const entries = Object.entries(videoDataMap);

  entries.sort((a, b) => {
    const A = a[1];
    const B = b[1];

    const ATrending = A.cycleViews >= 10;
    const BTrending = B.cycleViews >= 10;

    if (ATrending && !BTrending) return -1;
    if (!ATrending && BTrending) return 1;

    if (ATrending && BTrending) {
      return B.cycleViews - A.cycleViews;
    }

    return A.originalIndex - B.originalIndex;
  });

  const newOrder = entries.map(([id]) => id);
  const oldOrder = JSON.parse(getCache(ORDER_KEY) || "[]");

  if (!force && JSON.stringify(newOrder) === JSON.stringify(oldOrder)) return;

  saveCache(ORDER_KEY, JSON.stringify(newOrder));

  newOrder.forEach(id => {
    const el = videoElements[id]?.box;
    if (el) videosContainer.appendChild(el);
  });
}

/* ---------------- LOAD ---------------- */
createLoader();

fetch(dataSource)
  .then(res => res.json())
  .then(videos => {

    removeLoader();

    const filtered = folderName
      ? videos.filter(v =>
          (v.folder || "").trim().toLowerCase() === folderName
        )
      : videos;

    if (filtered.length === 0) {
      videosContainer.innerHTML = "<p>No videos found.</p>";
      return;
    }

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

  })
  .catch(err => console.error(err));
