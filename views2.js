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
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0","") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0","") + "K";
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

/* ---------------- CONTAINER ---------------- */
const videosContainer = document.getElementById("normalVideos");
const videoElements = {};

/* ---------------- VIDEO BOX ---------------- */
const videoBoxWidth = 600;
const videoBoxHeight = 169;

function createVideoBox(video) {
  const box = document.createElement("div");
  box.className = "videoBox";
  box.style.height = `${videoBoxHeight + 60}px`;

  /* ---------------- WRAPPER ---------------- */
  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";
  wrapper.style.position = "relative";
  wrapper.style.width = "100%";
  wrapper.style.maxWidth = `${videoBoxWidth}px`;
  wrapper.style.aspectRatio = "16/9";

  /* ---------------- LOADER ---------------- */
  const loader = document.createElement("div");
  loader.className = "imgLoader";

  /* ---------------- IMAGE ---------------- */
  const thumb = document.createElement("img");
  thumb.style.width = "100%";
  thumb.style.height = "100%";
  thumb.style.objectFit = "cover";
  thumb.style.opacity = "0";
  thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(video.thumbnail)}`;

  /* IMAGE LOADED */
  thumb.onload = () => {
    thumb.style.opacity = "1";
    loader.remove();
  };

  /* ERROR HANDLING */
  thumb.onerror = () => {
    loader.textContent = "Failed to load";
  };

  /* CLICK */
  thumb.onclick = () => {
    increaseViews(video.id);

    const iframe = document.createElement("iframe");
    iframe.src = video.embed;
    iframe.allowFullscreen = true;

    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);
  };

  wrapper.appendChild(loader);
  wrapper.appendChild(thumb);

  /* ---------------- TITLE ---------------- */
  const title = document.createElement("h3");
  title.className = "videoTitle";
  title.textContent = video.title;
  title.onclick = () => {
    increaseViews(video.id);
    window.open(video.url, "_blank");
  };

  /* ---------------- VIEWS ---------------- */
  const views = document.createElement("div");
  views.className = "views";
  views.textContent = `👁 ${formatViews(video.totalViews)}`;

  /* ---------------- BUTTON ---------------- */
  const btn = document.createElement("a");
  btn.className = "download";
  btn.href = "#";
  btn.textContent = `Download (${video.size || "?"})`;
  btn.onclick = (e) => {
    e.preventDefault();
    increaseViews(video.id);
    window.open(video.url, "_blank");
  };

  box.appendChild(wrapper);
  box.appendChild(title);
  box.appendChild(views);
  box.appendChild(btn);

  return box;
}

/* ---------------- UI UPDATE ---------------- */
function updateUI(id) {
  const v = videoElements[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, cycle);

  const isTrending = cycle >= 10;

  if (v.box.parentElement === videosContainer) {
    videosContainer.removeChild(v.box);
  }

  if (isTrending) {
    videosContainer.insertBefore(v.box, videosContainer.firstChild);
  } else {
    if (v.originalIndex >= videosContainer.children.length) {
      videosContainer.appendChild(v.box);
    } else {
      videosContainer.insertBefore(v.box, videosContainer.children[v.originalIndex]);
    }
  }

  const newText = isTrending
    ? `🔥 Trending | 👁 ${formatViews(total)}`
    : `👁 ${formatViews(total)}`;

  if (v.views.textContent !== newText) {
    v.views.textContent = newText;
    v.views.style.color = isTrending ? "#ffcc00" : "#aaa";
  }
}

/* ---------------- RENDER ---------------- */
function renderVideos(videos) {
  videosContainer.innerHTML = "";

  const filtered = folderName
    ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
    : videos;

  filtered.forEach((v, index) => {
    const box = createVideoBox(v);
    videosContainer.appendChild(box);

    videoElements[v.id] = {
      box,
      views: box.querySelector(".views"),
      totalViews: v.totalViews || 0,
      cycleViews: v.cycleViews || 0,
      originalIndex: index
    };

    onValue(ref(db, "views/" + v.id), snap => {
      videoElements[v.id].totalViews = snap.val() || 0;
      updateUI(v.id);
    });

    onValue(ref(db, "cycleViews/" + v.id), snap => {
      videoElements[v.id].cycleViews = Number(snap.val()) || 0;
      updateUI(v.id);
    });
  });

  setTimeout(() => {
    Object.keys(videoElements).forEach(id => {
      if (videoElements[id].cycleViews >= 10) {
        updateUI(id);
      }
    });
  }, 0);
}

/* ---------------- LOAD VIDEOS (INSTANT) ---------------- */
const cached = getCache("videos");

if (cached) {
  try {
    renderVideos(JSON.parse(cached));
  } catch (e) {
    console.error("Cache error:", e);
  }
}

fetch(dataSource)
  .then(res => res.json())
  .then(videos => {
    saveCache("videos", JSON.stringify(videos));
    renderVideos(videos);
  })
  .catch(error => {
    console.error("Error loading videos:", error);
  });
