import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

/* ---------------- STATE ---------------- */
let videoList = [];
let currentIndex = 0;

/* ---------------- TEST MODE ---------------- */
const TEST_MODE = localStorage.getItem("testMode") === "true";

/* ---------------- VISIT TRACKING ---------------- */
const VISIT_ID_KEY = "visit_id";

let visitId = localStorage.getItem(VISIT_ID_KEY);

if (!visitId) {
  visitId = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(VISIT_ID_KEY, visitId);
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

/* ---------------- STATE MAPS ---------------- */
const videoDataMap = {};
const videoElements = {};
let currentPreviewVideo = null;

/* ---------------- STOP VIDEO ---------------- */
function stopVideo(video) {
  if (!video) return;
  video.pause();
  video.currentTime = 0;
}

/* ---------------- SWIPE NAVIGATION (FIXED) ---------------- */
function goNextVideo() {
  if (currentIndex < videoList.length - 1) {
    currentIndex++;
    scrollToVideo(videoList[currentIndex]);
  }
}

function goPrevVideo() {
  if (currentIndex > 0) {
    currentIndex--;
    scrollToVideo(videoList[currentIndex]);
  }
}

function scrollToVideo(id) {
  const el = videoElements[id]?.box;
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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
  const normalized = (rawFolderName || "").toLowerCase();

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

/* ---------------- VIDEO BOX ---------------- */
function createVideoBox(video) {

  const box = document.createElement("div");
  box.className = "videoBox";

  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";
  wrapper.style.position = "relative";

  /* ---------------- SWIPE (FIXED HERE) ---------------- */
  let startX = 0;
  let startY = 0;

  wrapper.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  wrapper.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - startX;
    const diffY = Math.abs(endY - startY);

    if (diffY > 50) return; // ignore scroll

    if (diffX < -60) goNextVideo();
    if (diffX > 60) goPrevVideo();
  });

  /* ---------------- PREVIEW VIDEO ---------------- */
  const preview = document.createElement("video");
  preview.src = video.preview;
  preview.muted = true;
  preview.loop = true;
  preview.playsInline = true;
  preview.preload = "metadata";
  preview.style.width = "100%";
  preview.style.height = "100%";
  preview.style.objectFit = "cover";

  observer.observe(preview);

  preview.onclick = () => {
    countWatchOnce(video.id);
  };

  wrapper.appendChild(preview);

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

  box.appendChild(wrapper);

  return box;
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
      document.getElementById("normalVideos").innerHTML = "<p>No videos found.</p>";
      return;
    }

    videoList = filtered.map(v => v.id);
    currentIndex = 0;

    filtered.forEach((v, index) => {

      videoDataMap[v.id] = {
        ...v,
        originalIndex: index
      };

      const box = createVideoBox(v);
      document.getElementById("normalVideos").appendChild(box);

      videoElements[v.id] = { box };
    });

  })
  .catch(console.error);
