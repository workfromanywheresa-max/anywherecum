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
const dataSource = config.dataSource || "test.json";

/* ---------------- CACHE ---------------- */
function saveCache(key, value) { localStorage.setItem(key, value); }
function getCache(key) { return localStorage.getItem(key); }

/* ---------------- STATE ---------------- */
const videoDataMap = {};
const originalOrder = [];
const videoElements = {};

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
  } catch (err) { console.error("Worker failed:", err); }
}
function increaseViews(videoId) {
  if (!TEST_MODE) sendToWorker("clicked_" + videoId);
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
  spinner.style.border = "4px solid rgba(255, 255, 255, 0.3)";
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

  /* DEFAULT 480p */
  const defaultQuality =
    video.qualities.find(q => q.label.includes("480")) ||
    video.qualities[0];

  let currentEmbed = defaultQuality.embed;

  function loadPlayer() {
    const iframe = document.createElement("iframe");
    iframe.src = currentEmbed;
    iframe.allowFullscreen = true;
    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);
  }

  /* THUMB */
  const thumb = document.createElement("img");
  thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(video.thumbnail)}`;
  thumb.onclick = () => {
    increaseViews(video.id);
    loadPlayer();
  };
  wrapper.appendChild(thumb);

  /* DROPDOWN */
  const select = document.createElement("select");
  select.style.margin = "8px auto";
  select.style.display = "block";

  video.qualities.forEach((q, index) => {
    const option = document.createElement("option");
    option.value = index;

    /* ✅ ONLY THIS */
    option.textContent = `Stream - ${q.label}`;

    if (q === defaultQuality) option.selected = true;
    select.appendChild(option);
  });

  select.onchange = () => {
    const selected = video.qualities[select.value];
    currentEmbed = selected.embed;

    if (wrapper.querySelector("iframe")) {
      loadPlayer();
    }
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
  downloadBtn.style.marginTop = "8px";

  const downloadBox = document.createElement("div");
  downloadBox.style.display = "none";

  video.qualities.forEach(q => {
    const link = document.createElement("a");
    link.href = q.download;
    link.target = "_blank";

    link.textContent = `${q.label} • ${q.size}`;

    link.style.display = "block";
    link.style.margin = "5px 0";
    link.style.color = "#ff4444";

    link.onclick = () => increaseViews(video.id);

    downloadBox.appendChild(link);
  });

  downloadBtn.onclick = () => {
    downloadBox.style.display =
      downloadBox.style.display === "none" ? "block" : "none";
  };

  /* APPEND */
  box.appendChild(select);
  box.appendChild(wrapper);
  box.appendChild(title);
  box.appendChild(views);
  box.appendChild(downloadBtn);
  box.appendChild(downloadBox);

  return box;
}

/* ---------------- RENDER ---------------- */
function renderVideos() {
  const arr = Object.values(videoDataMap);

  arr.sort((a, b) => {
    const aTrending = a.cycleViews >= 10;
    const bTrending = b.cycleViews >= 10;

    if (aTrending && !bTrending) return -1;
    if (!aTrending && bTrending) return 1;

    return originalOrder.indexOf(a.id) - originalOrder.indexOf(b.id);
  });

  videosContainer.innerHTML = "";

  arr.forEach(v => {
    videosContainer.appendChild(videoElements[v.id].box);
  });
}

/* ---------------- UI UPDATE ---------------- */
function updateUI(id) {
  const v = videoDataMap[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const isTrending = v.cycleViews >= 10;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, v.cycleViews);

  const newText = isTrending
    ? `🔥 Trending | 👁 ${formatViews(total)}`
    : `👁 ${formatViews(total)}`;

  const el = videoElements[id].views;

  if (el.textContent !== newText) {
    el.textContent = newText;
    el.style.color = isTrending ? "#ffcc00" : "#aaa";
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

    filtered.forEach((v) => {
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
        views: box.querySelector(".views")
      };

      updateUI(v.id);

      onValue(ref(db, "views/" + v.id), snap => {
        const val = snap.val();
        if (val !== null) {
          videoDataMap[v.id].totalViews = val;
          updateUI(v.id);
          saveCache("views_" + v.id, val);
          renderVideos();
        }
      });

      onValue(ref(db, "cycleViews/" + v.id), snap => {
        const val = snap.val();
        if (val !== null) {
          videoDataMap[v.id].cycleViews = Number(val);
          updateUI(v.id);
          saveCache("cycle_" + v.id, val);
          renderVideos();
        }
      });
    });

    renderVideos();
  })
  .catch(err => {
    console.error(err);
    removeLoader();
  });
