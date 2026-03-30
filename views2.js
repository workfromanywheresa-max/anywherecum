import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

/* ---------------- CONFIG ---------------- */
const config = window.VIDEO_CONFIG || {};
const folderName = (config.folder || "").toLowerCase();
const dataSource = config.dataSource || "videos.json";

/* ---------------- CACHE ---------------- */
const saveCache = (k, v) => localStorage.setItem(k, v);
const getCache = (k) => localStorage.getItem(k);

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

/* ---------------- CONTAINER ---------------- */
const container = document.getElementById("normalVideos");
const videoElements = {};

/* ---------------- VIDEO BOX ---------------- */
function createVideoBox(video) {
  const box = document.createElement("div");
  box.className = "videoBox";

  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";

  /* SHIMMER LOADER */
  const loader = document.createElement("div");
  loader.className = "imgLoader";

  /* IMAGE */
  const img = document.createElement("img");
  img.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(video.thumbnail)}`;
  img.style.opacity = "0";

  img.onload = () => {
    img.style.opacity = "1";
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 300);
  };

  /* CLICK TO PLAY */
  img.onclick = () => {
    increaseViews(video.id);

    const iframe = document.createElement("iframe");
    iframe.src = video.embed;
    iframe.allowFullscreen = true;

    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);
  };

  /* ORDER */
  wrapper.appendChild(loader);
  wrapper.appendChild(img);

  /* TITLE */
  const title = document.createElement("h3");
  title.className = "videoTitle";
  title.textContent = video.title;

  title.onclick = () => {
    increaseViews(video.id);
    window.open(video.url, "_blank");
  };

  /* VIEWS */
  const views = document.createElement("div");
  views.className = "views";

  /* DOWNLOAD */
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

/* ---------------- UPDATE UI ---------------- */
function updateUI(id) {
  const v = videoElements[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;

  const isTrending = cycle >= 10;

  if (isTrending) {
    v.views.innerHTML = `🔥 <span class="trendingText">Trending</span> | 👁 ${formatViews(total)}`;
  } else {
    v.views.textContent = `👁 ${formatViews(total)}`;
  }
}

/* ---------------- WORKER ---------------- */
function increaseViews(id) {
  fetch("https://anywherecum.workfromanywhere-sa.workers.dev/increment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId: "clicked_" + id })
  }).catch(() => {});
}

/* ---------------- RENDER ---------------- */
function renderVideos(videos) {
  container.innerHTML = "";

  const filtered = folderName
    ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
    : videos;

  filtered.forEach((v, index) => {
    const box = createVideoBox(v);
    container.appendChild(box);

    videoElements[v.id] = {
      box,
      views: box.querySelector(".views"),
      totalViews: v.totalViews || 0,
      cycleViews: v.cycleViews || 0,
      originalIndex: index
    };

    /* FIREBASE LISTENERS */
    onValue(ref(db, "views/" + v.id), snap => {
      videoElements[v.id].totalViews = snap.val() || 0;
      updateUI(v.id);
    });

    onValue(ref(db, "cycleViews/" + v.id), snap => {
      videoElements[v.id].cycleViews = Number(snap.val()) || 0;
      updateUI(v.id);
    });
  });
}

/* ---------------- LOAD ---------------- */
const cached = getCache("videos");

if (cached) {
  try {
    renderVideos(JSON.parse(cached));
  } catch {}
}

fetch(dataSource)
  .then(r => r.json())
  .then(videos => {
    saveCache("videos", JSON.stringify(videos));
    renderVideos(videos);
  })
  .catch(console.error);
