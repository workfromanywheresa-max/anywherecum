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
/* ✅ FIXED: Read folder from URL instead of VIDEO_CONFIG */
const params = new URLSearchParams(window.location.search);
const folderName = (params.get("folder") || "").toLowerCase();

const dataSource = "test.json";

/* ---------------- SESSION TRACKING ---------------- */
function hasViewed(id) {
  return sessionStorage.getItem("viewed_" + id);
}
function markViewed(id) {
  sessionStorage.setItem("viewed_" + id, "true");
}

function hasDownloaded(id) {
  return sessionStorage.getItem("downloaded_" + id);
}
function markDownloaded(id) {
  sessionStorage.setItem("downloaded_" + id, "true");
}

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
  folderName ? toTitleCase(folderName) : "All Folders";

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

/* ---------------- DOWNLOAD DROPDOWN ---------------- */
function createDownloadDropdown(video) {
  const wrapper = document.createElement("div");

  const btn = document.createElement("button");
  btn.className = "download";
  btn.textContent = "Download ⬇";

  const dropdown = document.createElement("div");
  dropdown.style.display = "none";
  dropdown.style.marginTop = "5px";

  if (video.qualities && video.qualities.length > 0) {
    video.qualities.forEach(q => {
      const a = document.createElement("a");
      a.href = q.download;
      a.target = "_blank";
      a.className = "download";
      a.textContent = `${q.label} (${q.size || "?"})`;
      dropdown.appendChild(a);
    });
  } else {
    const a = document.createElement("a");
    a.href = video.url;
    a.target = "_blank";
    a.className = "download";
    a.textContent = `Download (${video.size || "?"})`;
    dropdown.appendChild(a);
  }

  btn.onclick = () => {
    const key = "downloaded_" + video.id;

    if (!sessionStorage.getItem(key)) {
      increaseViews(video.id);
      sessionStorage.setItem(key, "true");
    }

    dropdown.style.display =
      dropdown.style.display === "none" ? "block" : "none";
  };

  wrapper.appendChild(btn);
  wrapper.appendChild(dropdown);

  return wrapper;
}

/* ---------------- VIDEO BOX ---------------- */
function createVideoBox(video) {
  const box = document.createElement("div");
  box.className = "videoBox";

  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";

  function markViewOnce() {
    const key = "viewed_" + video.id;

    if (!sessionStorage.getItem(key)) {
      increaseViews(video.id);
      sessionStorage.setItem(key, "true");
    }
  }

  /* ---------------- QUALITY DROPDOWN ---------------- */
  let dropdown = null;

  if (video.qualities && video.qualities.length > 0) {
    dropdown = document.createElement("select");

    video.qualities.forEach(q => {
      const opt = document.createElement("option");
      opt.value = q.embed;
      opt.textContent = q.label;
      dropdown.appendChild(opt);
    });

    dropdown.addEventListener("change", () => {
      markViewOnce();

      const iframe = document.createElement("iframe");
      iframe.src = dropdown.value;
      iframe.allowFullscreen = true;

      wrapper.innerHTML = "";
      wrapper.appendChild(iframe);
    });
  }

  /* ---------------- THUMB ---------------- */
  const thumb = document.createElement("img");
  thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(video.thumbnail)}`;

  thumb.onclick = () => {
    markViewOnce();

    const iframe = document.createElement("iframe");
    iframe.src = video.qualities ? video.qualities[0].embed : video.embed;
    iframe.allowFullscreen = true;

    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);
  };

  wrapper.appendChild(thumb);

  /* ---------------- TITLE (NO CLICK ACTION) ---------------- */
  const title = document.createElement("h3");
  title.className = "videoTitle";
  title.textContent = video.title;

  title.style.cursor = "default";

  /* ---------------- VIEWS ---------------- */
  const views = document.createElement("div");
  views.className = "views";

  /* ---------------- BUILD ---------------- */
  if (dropdown) box.appendChild(dropdown);

  box.appendChild(wrapper);
  box.appendChild(title);
  box.appendChild(views);
  box.appendChild(createDownloadDropdown(video));

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

  const container = document.getElementById("normalVideos");
  container.innerHTML = "";

  arr.forEach(v => {
    container.appendChild(videoElements[v.id].box);
  });
}

/* ---------------- UI ---------------- */
function updateUI(id) {
  const v = videoDataMap[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const isTrending = v.cycleViews >= 10;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, v.cycleViews);

  const el = videoElements[id].views;

  el.textContent = isTrending
    ? `🔥 Trending | 👁 ${formatViews(total)}`
    : `👁 ${formatViews(total)}`;

  el.style.color = isTrending ? "#ffcc00" : "#aaa";
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
      document.getElementById("normalVideos").appendChild(box);

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
          renderVideos();
        }
      });

      onValue(ref(db, "cycleViews/" + v.id), snap => {
        const val = snap.val();
        if (val !== null && val !== undefined) {
          videoDataMap[v.id].cycleViews = Number(val);
          updateUI(v.id);
          saveCache("cycle_" + v.id, val);
          renderVideos();
        }
      });

    });

    renderVideos();
  })
  .catch(err => console.error(err));
