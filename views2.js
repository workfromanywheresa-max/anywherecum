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

/* 🔥 FIX: prevent multiple triggers */
const countedVideos = new Set();
const cooldownMap = {};
const COOLDOWN = 3000;

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

/* ---------------- COUNT LOGIC (FIXED) ---------------- */
function canCount(videoId, type) {
  const key = `${visitId}_${type}_${videoId}`;
  const now = Date.now();

  if (countedVideos.has(key)) return false;
  if (cooldownMap[key] && now - cooldownMap[key] < COOLDOWN) return false;

  countedVideos.add(key);
  cooldownMap[key] = now;

  sessionStorage.setItem(key, "1");
  return true;
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

/* ---------------- INCREASE VIEWS ---------------- */
function increaseViews(videoId) {
  if (!TEST_MODE) {
    sendToWorker("clicked_" + videoId);
  }
}

/* ---------------- COUNT FUNCTIONS ---------------- */
function countWatchOnce(videoId) {
  if (!canCount(videoId, "watch")) return;
  increaseViews(videoId);
}

function countDownloadOnce(videoId) {
  if (!canCount(videoId, "download")) return;
  increaseViews(videoId);
}

/* ---------------- UI + VIDEO CODE (UNCHANGED) ---------------- */

const videosContainer = document.getElementById("normalVideos");

/* ---------- TITLE ---------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const titleEl = document.getElementById("folderTitle");
if (titleEl) {
  titleEl.textContent = folderName ? toTitleCase(folderName) : "All Videos";
}

/* ---------- FORMAT ---------- */
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num;
}

/* ---------- VIDEO BOX ---------- */
function createVideoBox(video) {

  const box = document.createElement("div");

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";

  let currentEmbed = video.qualities[0].embed;

  function loadPlayer() {
    if (wrapper.dataset.loaded === "true") return;
    wrapper.dataset.loaded = "true";

    const iframe = document.createElement("iframe");
    iframe.src = currentEmbed;
    iframe.allowFullscreen = true;

    wrapper.replaceChildren(iframe);
  }

  const preview = document.createElement("video");
  preview.src = video.preview;
  preview.muted = true;
  preview.loop = true;

  preview.onclick = () => {
    countWatchOnce(video.id);
    loadPlayer();
  };

  wrapper.appendChild(preview);

  const views = document.createElement("div");
  views.style.position = "absolute";
  views.style.bottom = "8px";
  views.style.left = "8px";
  views.style.background = "rgba(0,0,0,0.6)";
  views.style.padding = "4px 8px";
  views.style.borderRadius = "6px";

  wrapper.appendChild(views);

  /* DOWNLOAD */
  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Download";

  downloadBtn.onclick = () => {
    countDownloadOnce(video.id);
  };

  box.appendChild(wrapper);
  box.appendChild(downloadBtn);

  box.views = views;

  return box;
}

/* ---------- UPDATE UI ---------- */
function updateUI(id) {
  const v = videoDataMap[id];
  if (!v || !videoElements[id]) return;

  const total = v.totalViews || 0;
  const isTrending = v.cycleViews >= 10;

  const text = isTrending
    ? `🔥 Trending | 👁 ${formatViews(total)}`
    : `👁 ${formatViews(total)}`;

  videoElements[id].views.textContent = text;
}

/* ---------- REORDER (YOUR LOGIC KEPT) ---------- */
function reorderVideos() {
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

  entries.forEach(([id]) => {
    const el = videoElements[id]?.box;
    if (el) videosContainer.appendChild(el);
  });
}

/* ---------- LOAD ---------- */
fetch(dataSource)
  .then(res => res.json())
  .then(videos => {

    videos.forEach((v, index) => {

      videoDataMap[v.id] = {
        ...v,
        originalIndex: index
      };

      const box = createVideoBox(v);
      videosContainer.appendChild(box);

      videoElements[v.id] = {
        box,
        views: box.views
      };

      updateUI(v.id);
    });

    reorderVideos();

    /* FIREBASE LISTEN */
    videos.forEach(v => {

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
          videoDataMap[v.id].cycleViews = val;
          updateUI(v.id);
          reorderVideos();
        }
      });

    });

  })
  .catch(console.error);
