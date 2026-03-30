import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

/* ---------------- CONFIG ---------------- */
const TEST_MODE = localStorage.getItem("testMode") === "true";
const config = window.VIDEO_CONFIG || {};
const folderName = (config.folder || "").toLowerCase();
const dataSource = config.dataSource || "vip.json";

/* ---------------- CONTAINER ---------------- */
const normalContainer = document.getElementById("normalVideos");
const videoElements = {};

/* ---------------- UTILS ---------------- */
function saveCache(key, value) { localStorage.setItem(key, value); }
function getCache(key) { return localStorage.getItem(key); }

function toTitleCase(str) {
  return str.toLowerCase().split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num;
}

function increaseViews(videoId) {
  if (TEST_MODE) return;
  fetch("https://anywherecum.workfromanywhere-sa.workers.dev/increment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId: "clicked_" + videoId })
  }).catch(err => console.error("Worker failed:", err));
}

/* ---------------- TRENDING / UI UPDATE ---------------- */
function updateUI(id) {
  const v = videoElements[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, cycle);

  // Update view count
  const newText = `👁 ${formatViews(total)}`;
  if (v.views.textContent !== newText) v.views.textContent = newText;

  // Move trending videos to top
  const currentIndex = Array.from(normalContainer.children).indexOf(v.box);
  if (cycle >= 10 && currentIndex > 0) normalContainer.insertBefore(v.box, normalContainer.firstChild);
  else if (cycle < 10 && currentIndex === 0) normalContainer.appendChild(v.box);

  // Highlight trending videos visually
  v.box.style.border = cycle >= 10 ? "2px solid #ff4444" : "none";
}

/* ---------------- SET FOLDER TITLE ---------------- */
document.getElementById("folderTitle").textContent = folderName
  ? toTitleCase(folderName)
  : "🔐VIP Exclusive";

/* ---------------- LOAD VIDEOS ---------------- */
async function loadVideos() {
  try {
    const res = await fetch(dataSource);
    const videos = await res.json();

    const filtered = folderName
      ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
      : videos;

    if (!filtered.length) {
      normalContainer.innerHTML = `<p style="text-align:center;color:#aaa;">No videos available.</p>`;
      return;
    }

    // Add skeleton for each video
    filtered.forEach(v => {
      const skeleton = document.createElement("div");
      skeleton.className = "videoBox skeleton-video";
      skeleton.innerHTML = `
        <div class="videoFrameWrapper skeleton-frame"></div>
        <div class="videoTitle skeleton-text"></div>
        <div class="views skeleton-text"></div>
        <div class="download skeleton-button"></div>
      `;
      normalContainer.appendChild(skeleton);
      v._skeleton = skeleton;
    });

    filtered.forEach(v => {
      const box = document.createElement("div");
      box.className = "videoBox";

      const wrapper = document.createElement("div");
      wrapper.className = "videoFrameWrapper";

      const thumb = document.createElement("img");
      thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(v.thumbnail)}`;
      thumb.alt = v.title;

      // Always show video box whether thumbnail loads or fails
      thumb.onload = thumb.onerror = () => {
        if (v._skeleton) v._skeleton.remove();
        wrapper.appendChild(thumb);
        normalContainer.appendChild(box);
        updateUI(v.id); // Apply trending if cycleViews >= 10
      };

      // Click to replace thumbnail with iframe
      thumb.onclick = () => {
        increaseViews(v.id);
        const iframe = document.createElement("iframe");
        iframe.src = v.embed;
        iframe.allowFullscreen = true;
        wrapper.innerHTML = "";
        wrapper.appendChild(iframe);
      };

      const title = document.createElement("h3");
      title.className = "videoTitle";
      title.textContent = v.title;
      title.onclick = () => {
        increaseViews(v.id);
        window.open(v.url, "_blank");
      };

      const views = document.createElement("div");
      views.className = "views";
      const cachedViews = getCache("views_" + v.id);
      const cachedCycle = getCache("cycle_" + v.id);
      views.textContent = `👁 ${formatViews(cachedViews ? Number(cachedViews) : 0)}`;

      const btn = document.createElement("a");
      btn.className = "download";
      btn.href = "#";
      btn.textContent = `Download (${v.size || "?"})`;
      btn.onclick = e => {
        e.preventDefault();
        increaseViews(v.id);
        window.open(v.url, "_blank");
      };

      box.appendChild(wrapper);
      box.appendChild(title);
      box.appendChild(views);
      box.appendChild(btn);

      // Store references for trending and view updates
      videoElements[v.id] = {
        box,
        views,
        totalViews: cachedViews ? Number(cachedViews) : 0,
        cycleViews: cachedCycle ? Number(cachedCycle) : 0
      };

      // Firebase listeners
      onValue(ref(db, "views/" + v.id), snap => {
        videoElements[v.id].totalViews = snap.val() || 0;
        updateUI(v.id);
      });
      onValue(ref(db, "cycleViews/" + v.id), snap => {
        videoElements[v.id].cycleViews = Number(snap.val()) || 0;
        updateUI(v.id);
      });

      // Optional fail-safe: remove skeleton after 5s if not loaded
      setTimeout(() => {
        if (v._skeleton) {
          v._skeleton.remove();
          wrapper.appendChild(thumb);
          normalContainer.appendChild(box);
          updateUI(v.id);
        }
      }, 5000);
    });
  } catch (err) {
    console.error("Failed to load videos:", err);
    normalContainer.innerHTML = `<p style="text-align:center;color:#aaa;">Failed to load videos.</p>`;
  }
}

loadVideos();
