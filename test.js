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
const dataSource = config.dataSource || "videos.json";

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
  folderName ? toTitleCase(folderName) : "🔐VIP Exclusive";

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

  /* ✅ FIX: ensure qualities exist */
  const qualities = (video.qualities || []).slice();

  /* ✅ FIX: 480p always first */
  qualities.sort((a, b) => {
    if (a.label.includes("480")) return -1;
    if (b.label.includes("480")) return 1;
    return 0;
  });

  /* SELECT DEFAULT (480p if exists) */
  let currentQuality = qualities[0];

  const iframe = document.createElement("iframe");
  iframe.src = currentQuality?.embed || video.embed || "";
  iframe.allowFullscreen = true;

  const img = document.createElement("img");
  img.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(video.thumbnail)}`;

  wrapper.appendChild(img);

  img.onclick = () => {
    increaseViews(video.id);
    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);
  };

  /* QUALITY DROPDOWN */
  const select = document.createElement("select");

  qualities.forEach(q => {
    const option = document.createElement("option");
    option.value = q.embed;
    option.textContent = q.label;
    select.appendChild(option);
  });

  select.onchange = () => {
    iframe.src = select.value;
    increaseViews(video.id);
  };

  /* TITLE */
  const title = document.createElement("h3");
  title.className = "videoTitle";
  title.textContent = video.title;
  title.onclick = () => {
    increaseViews(video.id);
    window.open(video.url, "_blank");
  };

  /* VIEWS (UNCHANGED) */
  const views = document.createElement("div");
  views.className = "views";

  /* DOWNLOAD */
  const btn = document.createElement("a");
  btn.className = "download";
  btn.href = "#";
  btn.textContent = "Download";
  btn.onclick = (e) => {
    e.preventDefault();
    increaseViews(video.id);
    window.open(video.url, "_blank");
  };

  box.appendChild(wrapper);
  box.appendChild(select);
  box.appendChild(title);
  box.appendChild(views);
  box.appendChild(btn);

  return box;
}

/* ---------------- RENDER ---------------- */
function renderVideos() {
  const arr = Object.values(videoDataMap);

  arr.sort((a, b) => originalOrder.indexOf(a.id) - originalOrder.indexOf(b.id));

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
fetch(dataSource)
  .then(res => res.json())
  .then(videos => {

    const filtered = folderName
      ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
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
        views: box.querySelector(".views")
      };

      updateUI(v.id);

      onValue(ref(db, "views/" + v.id), snap => {
        const val = snap.val();
        if (val !== null && val !== undefined) {
          videoDataMap[v.id].totalViews = val;
          updateUI(v.id);
          saveCache("views_" + v.id, val);
        }
      });

      onValue(ref(db, "cycleViews/" + v.id), snap => {
        const val = snap.val();
        if (val !== null && val !== undefined) {
          videoDataMap[v.id].cycleViews = Number(val);
          updateUI(v.id);
          saveCache("cycle_" + v.id, val);
        }
      });
    });

    renderVideos();
  })
  .catch(err => console.error(err));
