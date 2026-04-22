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

let visitId = localStorage.getItem(VISIT_ID_KEY);

if (!visitId) {
  visitId = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(VISIT_ID_KEY, visitId);
}

/* ---------------- WORKER 2 STATE ---------------- */
const sessionState = {};

/* ---------------- WORKER 2 (CLICK ONLY) ---------------- */
async function sendToWorker2(videoId, type, duration = 0) {
  try {
    await fetch("https://task.workfromanywhere-sa.workers.dev/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        type,
        duration,
        visitId
      })
    });
  } catch (err) {
    console.error("Worker 2 failed:", err);
  }
}

/* ---------------- CONFIG ---------------- */
const urlParams = new URLSearchParams(window.location.search);
const folderName = (urlParams.get("folder") || "").trim().toLowerCase();
const rawFolderName = (urlParams.get("folder") || "").trim();
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

/* ---------------- STOP VIDEO ---------------- */
function stopVideo(video) {
  if (!video) return;
  video.pause();
  video.currentTime = 0;
}

/* ---------------- OBSERVER ---------------- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) {
      stopVideo(entry.target);
    }
  });
}, { threshold: 0.3 });

/* ---------------- TITLE ---------------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const titleEl = document.getElementById("folderTitle");

if (titleEl) {
  const normalized = rawFolderName.toLowerCase();

  if (normalized === "🔒vip exclusive") {
    titleEl.textContent = "💎VIP Exclusive";
  } else {
    titleEl.textContent = rawFolderName ? toTitleCase(rawFolderName) : "All Videos";
  }
}

/* ---------------- FORMAT ---------------- */
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num;
}

/* ---------------- WORKER 1 ---------------- */
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

/* ---------------- COUNTING ---------------- */
function countWatchOnce(videoId) {
  const key = `${visitId}_watch_${videoId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  increaseViews(videoId);
}

function countDownloadOnce(videoId) {
  const key = `${visitId}_download_${videoId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  increaseViews(videoId);
}

/* ---------------- AD CLICK (ONLY AFTER PREVIEW) ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  const ad = document.getElementById("bottom-ad-container");

  if (!ad) return;

  ad.addEventListener("click", () => {
    const videoId = "global_ad";

    if (!sessionState.globalPreviewDone) {
      console.log("⛔ Ad blocked: preview not completed");
      return;
    }

    sendToWorker2(videoId, "ad_click", 0);
  });
});

/* ---------------- CONTAINER ---------------- */
const videosContainer = document.getElementById("normalVideos");

/* ---------------- VIDEO BOX ---------------- */
function createVideoBox(video) {

  const box = document.createElement("div");
  box.className = "videoBox";

  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";
  wrapper.style.position = "relative";

  const preview = document.createElement("video");
  preview.src = video.preview;
  preview.muted = true;
  preview.loop = true;
  preview.playsInline = true;
  preview.preload = "metadata";
  preview.style.width = "100%";
  preview.style.height = "100%";

  /* ---------------- PREVIEW CLICK (WORKER 2 ONLY HERE) ---------------- */
  preview.onclick = () => {
    countWatchOnce(video.id);

    sessionState[video.id] = { previewDone: true };
    sessionState.globalPreviewDone = true;

    sendToWorker2(video.id, "preview_click", 0);
  };

  wrapper.appendChild(preview);

  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Download";

  box.appendChild(wrapper);
  box.appendChild(downloadBtn);

  return box;
}

/* ---------------- TRENDING LOGIC (UNCHANGED) ---------------- */
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

/* ---------------- LOAD ---------------- */
fetch(dataSource)
  .then(res => res.json())
  .then(videos => {

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

  })
  .catch(console.error);
