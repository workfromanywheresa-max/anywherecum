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

/* ---------------- STATE ---------------- */
const videoDataMap = {};
const originalOrder = [];
const videoElements = {};

/* ---------------- CACHE ---------------- */
function saveCache(key, value) { localStorage.setItem(key, value); }
function getCache(key) { return localStorage.getItem(key); }

/* ---------------- TITLE ---------------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
  } catch (err) { console.error("Worker failed:", err); }
}
function increaseViews(videoId) {
  if (!TEST_MODE) sendToWorker("clicked_" + videoId);
}

/* ---------------- CONTAINER ---------------- */
const videosContainer = document.getElementById("normalVideos");

/* ---------------- VIDEO BOX ---------------- */
function createVideoBox(video) {
  const box = document.createElement("div");
  box.className = "videoBox";

  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";

  /* SORT QUALITIES → 480p FIRST */
  const sortedQualities = [...video.qualities].sort((a, b) => {
    if (a.label.includes("480")) return -1;
    if (b.label.includes("480")) return 1;
    return 0;
  });

  const defaultQuality =
    sortedQualities.find(q => q.recommended) ||
    sortedQualities.find(q => q.default) ||
    sortedQualities[0];

  let currentEmbed = defaultQuality.embed;

  function loadPlayer() {
    const iframe = document.createElement("iframe");
    iframe.src = currentEmbed;
    iframe.allowFullscreen = true;
    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);
  }

  const thumb = document.createElement("img");
  thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(video.thumbnail)}`;
  thumb.onclick = () => {
    increaseViews(video.id);
    loadPlayer();
  };
  wrapper.appendChild(thumb);

  const select = document.createElement("select");

  sortedQualities.forEach((q, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${q.label} • ${q.size}`;
    if (q === defaultQuality) option.selected = true;
    select.appendChild(option);
  });

  select.onchange = () => {
    const selected = sortedQualities[select.value];
    currentEmbed = selected.embed;

    if (wrapper.querySelector("iframe")) {
      loadPlayer();
    }
  };

  const title = document.createElement("h3");
  title.className = "videoTitle";
  title.textContent = video.title;

  const views = document.createElement("div");
  views.className = "views";

  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Download";
  downloadBtn.style.marginTop = "8px";

  const downloadBox = document.createElement("div");
  downloadBox.style.display = "none";

  sortedQualities.forEach(q => {
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

  box.appendChild(select);
  box.appendChild(wrapper);
  box.appendChild(title);
  box.appendChild(views);
  box.appendChild(downloadBtn);
  box.appendChild(downloadBox);

  return box;
}

/* ---------------- LOAD ---------------- */
const params = new URLSearchParams(window.location.search);

window.VIDEO_CONFIG = {
  dataSource: "test.json",
  folder: (params.get("folder") || "").toLowerCase().trim()
};

fetch(window.VIDEO_CONFIG.dataSource)
  .then(res => res.json())
  .then(videos => {

    const folderName = window.VIDEO_CONFIG.folder;

    const filtered = folderName
      ? videos.filter(v =>
          v.folder &&
          v.folder.toLowerCase().trim() === folderName
        )
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

      /* 🔥 YOUR ORIGINAL VIEWS LOGIC (UNCHANGED) */
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

      updateUI(v.id);
    });
  })
  .catch(err => console.error(err));

/* ---------------- UI UPDATE ---------------- */
function updateUI(id) {
  const v = videoDataMap[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const isTrending = v.cycleViews >= 10;

  const newText = isTrending
    ? `🔥 Trending | 👁 ${formatViews(total)}`
    : `👁 ${formatViews(total)}`;

  const el = videoElements[id].views;

  if (el.textContent !== newText) {
    el.textContent = newText;
    el.style.color = isTrending ? "#ffcc00" : "#aaa";
  }
}
