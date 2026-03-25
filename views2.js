import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* Firebase */
const app = initializeApp({
  apiKey: "AIzaSyCEX...",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

/* TEST MODE */
const TEST_MODE = localStorage.getItem("testMode") === "true";

/* CONFIG */
const config = window.VIDEO_CONFIG || {};
const folderName = (config.folder || "").toLowerCase();
const dataSource = config.dataSource || "videos.json";

/* Title */
if (folderName) {
  document.getElementById("folderTitle").textContent = folderName.toUpperCase();
} else if (dataSource.includes("vip")) {
  document.getElementById("folderTitle").textContent = "VIP VIDEOS";
} else {
  document.getElementById("folderTitle").textContent = "ALL VIDEOS";
}

/* Worker */
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
  if (TEST_MODE) return;
  sendToWorker(videoId);
}

/* Containers */
const trendingContainer = document.getElementById("trendingVideos");
const normalContainer = document.getElementById("normalVideos");

const videoElements = {};

/* UI update */
function updateUI(id) {
  const v = videoElements[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;
  const isTrending = cycle >= 10;

  const target = isTrending ? trendingContainer : normalContainer;

  /* ✅ Move element only if needed */
  if (v.box.parentElement !== target) {
    if (isTrending) {
      target.insertBefore(v.box, target.firstChild); // trending goes top
    } else {
      target.appendChild(v.box);
    }
  }

  /* UI text */
  v.views.textContent = isTrending
    ? `🔥 Trending | 👁 ${total}`
    : `👁 ${total}`;

  v.views.style.color = isTrending ? "#ffcc00" : "#aaa";
}

/* Load Videos */
fetch(dataSource)
.then(res => res.json())
.then(videos => {

  const filtered = folderName
    ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
    : videos;

  filtered.forEach(v => {

    const box = document.createElement("div");
    box.className = "videoBox";

    const wrapper = document.createElement("div");
    wrapper.className = "videoFrameWrapper";

    const thumb = document.createElement("img");
    thumb.className = "thumbnail";
    thumb.src = "https://anywherecum.pages.dev/images/" + v.thumbnail;

    thumb.onclick = () => {
      increaseViews(v.id);

      const iframe = document.createElement("iframe");
      iframe.src = v.url;
      iframe.allowFullscreen = true;

      wrapper.innerHTML = "";
      wrapper.appendChild(iframe);
    };

    wrapper.appendChild(thumb);

    const title = document.createElement("h3");
    title.className = "videoTitle";
    title.textContent = v.title;

    title.onclick = () => {
      increaseViews(v.id);
      window.open(v.url, "_blank");
    };

    const views = document.createElement("div");
    views.className = "views";
    views.textContent = "👁 0";

    const btn = document.createElement("a");
    btn.className = "download";
    btn.href = "#";
    btn.textContent = `Download (${v.size || "?"})`;

    btn.onclick = (e) => {
      e.preventDefault();
      increaseViews(v.id);
      window.open(v.url, "_blank");
    };

    box.appendChild(wrapper);
    box.appendChild(title);
    box.appendChild(views);
    box.appendChild(btn);

    normalContainer.appendChild(box);

    videoElements[v.id] = {
      box,
      views,
      totalViews: 0,
      cycleViews: 0
    };

    /* Firebase listeners */
    onValue(ref(db, "views/" + v.id), snap => {
      videoElements[v.id].totalViews = snap.val() || 0;
      updateUI(v.id);
    });

    onValue(ref(db, "cycleViews/" + v.id), snap => {
      videoElements[v.id].cycleViews = Number(snap.val()) || 0;
      updateUI(v.id);
    });

  });

});
