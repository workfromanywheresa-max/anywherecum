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
const urlParams = new URLSearchParams(window.location.search);
const folderName = (urlParams.get("folder") || "").trim().toLowerCase();
const config = window.VIDEO_CONFIG || {};
const dataSource = config.dataSource || "videos.json";

/* ---------------- CACHE ---------------- */
const cache = {};

function saveCache(key, value) {
  cache[key] = value;
  localStorage.setItem(key, value);
}

function getCache(key) {
  if (cache[key] !== undefined) return cache[key];
  const val = localStorage.getItem(key);
  cache[key] = val;
  return val;
}

/* ---------------- STATE ---------------- */
const videoDataMap = {};
const videoElements = {};
const originalOrder = [];

/* ---------------- TITLE ---------------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

document.getElementById("folderTitle").textContent =
  folderName ? toTitleCase(folderName) : "All Videos";

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
    console.error(err);
  }
}

function increaseViews(videoId) {
  if (!TEST_MODE) sendToWorker("clicked_" + videoId);
}

/* ---------------- TRACKING ---------------- */
const sessionFlags = new Set();

function countWatchOnce(id) {
  if (sessionFlags.has("watch_" + id)) return;
  sessionFlags.add("watch_" + id);
  increaseViews(id);
}

function countDownloadOnce(id) {
  if (sessionFlags.has("download_" + id)) return;
  sessionFlags.add("download_" + id);
  increaseViews(id);
}

/* ---------------- CONTAINER ---------------- */
const videosContainer = document.getElementById("normalVideos");

/* ---------------- VIDEO BOX ---------------- */
function createVideoBox(video) {

  const box = document.createElement("div");
  box.className = "videoBox";

  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";

  let currentEmbed = video.qualities[0].embed;

  function loadPlayer() {
    if (wrapper.dataset.loaded === "true") return;

    wrapper.dataset.loaded = "true";

    const iframe = document.createElement("iframe");
    iframe.src = currentEmbed;
    iframe.allowFullscreen = true;

    wrapper.replaceChildren(iframe);
  }

  const thumb = document.createElement("img");
  thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(video.thumbnail)}`;

  thumb.onclick = () => {
    countWatchOnce(video.id);
    loadPlayer();
  };

  wrapper.appendChild(thumb);

  const select = document.createElement("select");

  video.qualities.forEach((q, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Stream - ${q.label}`;
    select.appendChild(opt);
  });

  select.onchange = () => {
    currentEmbed = video.qualities[select.value].embed;

    countWatchOnce(video.id);

    wrapper.dataset.loaded = "false";
    loadPlayer();
  };

  const title = document.createElement("h3");
  title.textContent = video.title;

  const views = document.createElement("div");

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
    link.textContent = `${q.label} • ${q.size}`;
    link.target = "_blank";

    link.onclick = () => countDownloadOnce(video.id);

    downloadBox.appendChild(link);
  });

  box.appendChild(select);
  box.appendChild(wrapper);
  box.appendChild(title);
  box.appendChild(views);
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
      el.style.color = isTrending ? "#ffcc00" : "#aaa";
    });
  }
}

/* ---------------- LOAD ---------------- */
fetch(dataSource)
  .then(res => res.json())
  .then(videos => {

    const filtered = folderName
      ? videos.filter(v => (v.folder || "").toLowerCase() === folderName)
      : videos;

    filtered.forEach(v => {

      originalOrder.push(v.id);

      videoDataMap[v.id] = {
        ...v,
        totalViews: Number(getCache("views_" + v.id)) || v.totalViews || 0,
        cycleViews: Number(getCache("cycle_" + v.id)) || v.cycleViews || 0
      };

      const box = createVideoBox(v);
      videosContainer.appendChild(box);

      videoElements[v.id] = {
        box,
        views: box.querySelector("div")
      };

      updateUI(v.id);

      onValue(ref(db, "views/" + v.id), snap => {
        const val = snap.val();
        if (val !== null) {
          videoDataMap[v.id].totalViews = val;
          saveCache("views_" + v.id, val);
          updateUI(v.id);
        }
      });

      onValue(ref(db, "cycleViews/" + v.id), snap => {
        const val = snap.val();
        if (val !== null) {
          videoDataMap[v.id].cycleViews = Number(val);
          saveCache("cycle_" + v.id, val);
          updateUI(v.id);
        }
      });

    });

  })
  .catch(console.error);
