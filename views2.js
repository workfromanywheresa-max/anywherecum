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
  return cache[key] || localStorage.getItem(key);
}

/* ---------------- STATE ---------------- */
const videoDataMap = {};
const videoElements = {};

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

/* ---------------- ONE PER SESSION ---------------- */
const sessionFlags = new Set();

function countWatchOnce(videoId) {
  if (sessionFlags.has("watch_" + videoId)) return;
  sessionFlags.add("watch_" + videoId);
  increaseViews(videoId);
}

function countDownloadOnce(videoId) {
  if (sessionFlags.has("download_" + videoId)) return;
  sessionFlags.add("download_" + videoId);
  increaseViews(videoId);
}

/* ---------------- CONTAINER ---------------- */
const videosContainer = document.getElementById("normalVideos");

/* ---------------- VIDEO BOX ---------------- */
function createVideoBox(video) {

  const box = document.createElement("div");
  box.className = "videoBox";

  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";

  const defaultQuality =
    video.qualities.find(q => q.label.includes("480")) ||
    video.qualities[0];

  let currentEmbed = defaultQuality.embed;

  /* ✅ CREATE PLAYER ONLY ONCE */
  function loadPlayer() {
    if (wrapper.dataset.loaded === "true") return;

    wrapper.dataset.loaded = "true";

    const iframe = document.createElement("iframe");
    iframe.src = currentEmbed;
    iframe.allowFullscreen = true;

    /* REMOVE THUMB SMOOTHLY AFTER LOAD */
    iframe.onload = () => {
      if (thumb) thumb.style.display = "none";
    };

    wrapper.replaceChildren(iframe);
  }

  /* THUMB */
  const thumb = document.createElement("img");
  thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(video.thumbnail)}`;

  thumb.onclick = () => {
    countWatchOnce(video.id);
    loadPlayer();
  };

  wrapper.appendChild(thumb);

  /* DROPDOWN */
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

    /* swap player without flicker */
    wrapper.dataset.loaded = "false";
    loadPlayer();
  };

  /* TITLE */
  const title = document.createElement("h3");
  title.className = "videoTitle";
  title.textContent = video.title;

  /* VIEWS */
  const views = document.createElement("div");
  views.className = "views";

  /* DOWNLOAD */
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
      ? videos.filter(v =>
          (v.folder || "").trim().toLowerCase() === folderName
        )
      : videos;

    if (filtered.length === 0) {
      videosContainer.innerHTML = "<p>No videos found in this folder.</p>";
      return;
    }

    filtered.forEach(v => {

      videoDataMap[v.id] = {
        ...v,
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

      /* FIREBASE LISTENERS */
      onValue(ref(db, "views/" + v.id), snap => {
        const val = snap.val();
        if (val !== null) {
          videoDataMap[v.id].totalViews = val;
          updateUI(v.id);
          saveCache("views_" + v.id, val);
        }
      });

      onValue(ref(db, "cycleViews/" + v.id), snap => {
        const val = snap.val();
        if (val !== null) {
          videoDataMap[v.id].cycleViews = Number(val);
          updateUI(v.id);
          saveCache("cycle_" + v.id, val);
        }
      });

    });
  })
  .catch(err => console.error(err));
