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

/* ---------------- STOP VIDEO FUNCTION ---------------- */
function stopVideo(video) {
  if (!video) return;
  video.pause();
  video.currentTime = 0;
}

/* ---------------- INTERSECTION OBSERVER ---------------- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const video = entry.target;
    if (!entry.isIntersecting) stopVideo(video);
  });
}, { threshold: 0.3 });

/* ---------------- TITLE (FIXED VIP HERE) ---------------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ")
    .map(w => {
      if (w === "vip") return "VIP";
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

const rawFolder = urlParams.get("folder") || "";
const folderKey = rawFolder.trim().toLowerCase();

const titleEl = document.getElementById("folderTitle");
if (titleEl) {
  if (folderKey.includes("vip")) {
    titleEl.textContent = "🔒 VIP Exclusive";
  } else {
    titleEl.textContent = folderName ? toTitleCase(folderName) : "All Videos";
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
    loadPlayer();
  };

  wrapper.appendChild(preview);

  const title = document.createElement("h3");
  title.textContent = video.title;

  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Download";

  const downloadBox = document.createElement("div");
  downloadBox.style.display = "none";

  downloadBtn.onclick = () => {
    downloadBox.style.display =
      downloadBox.style.display === "none" ? "block" : "none";
    countDownloadOnce(video.id);
  };

  box.appendChild(wrapper);
  box.appendChild(title);
  box.appendChild(downloadBtn);
  box.appendChild(downloadBox);

  return box;
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
      const box = createVideoBox(v);
      videosContainer.appendChild(box);
    });

  })
  .catch(err => console.error(err));
