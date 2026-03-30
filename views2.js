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
const dataSource = config.dataSource || "videos.json";

/* ---------------- CACHE ---------------- */
function saveCache(key, value) { localStorage.setItem(key, value); }
function getCache(key) { return localStorage.getItem(key); }

/* ---------------- TITLE ---------------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
document.getElementById("folderTitle").textContent =
  folderName ? toTitleCase(folderName) : "🔐VIP Exclusive";

/* ---------------- FORMAT VIEWS ---------------- */
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num;
}

/* ---------------- VIEW INCREMENT ---------------- */
async function sendToWorker(videoId) {
  try {
    await fetch("https://anywherecum.workfromanywhere-sa.workers.dev/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId })
    });
  } catch (err) { console.error("Worker failed:", err); }
}
function increaseViews(videoId) { if (!TEST_MODE) sendToWorker("clicked_" + videoId); }

/* ---------------- UI ---------------- */
const normalContainer = document.getElementById("normalVideos");
const videoElements = {};

function updateUI(id) {
  const v = videoElements[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, cycle);

  const isTrending = cycle >= 10;
  const newText = isTrending ? `🔥 Trending | 👁 ${formatViews(total)}` : `👁 ${formatViews(total)}`;
  if (v.views.textContent !== newText) {
    v.views.textContent = newText;
    v.views.style.color = isTrending ? "#ffcc00" : "#aaa";
  }
}

/* ---------------- LOAD VIDEOS ---------------- */
document.addEventListener("DOMContentLoaded", () => {

  fetch(dataSource)
    .then(res => res.json())
    .then(videos => {

      const filtered = folderName
        ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
        : videos;

      // Initial skeletons
      for (let i = 0; i < 3; i++) {
        const skel = document.createElement("div");
        skel.className = "videoBox skeleton";
        skel.innerHTML = `
          <div class="videoFrameWrapper"></div>
          <div class="videoTitle"></div>
          <div class="views"></div>
          <div class="download"></div>
        `;
        normalContainer.appendChild(skel);
      }

      filtered.forEach(v => {

        // Remove one skeleton
        const skeleton = normalContainer.querySelector(".videoBox.skeleton");
        if (skeleton) skeleton.remove();

        const box = document.createElement("div");
        box.className = "videoBox";
        box.style.opacity = 0;
        box.style.transform = "translateY(10px)";
        box.style.transition = "opacity 0.3s ease, transform 0.3s ease";

        const wrapper = document.createElement("div");
        wrapper.className = "videoFrameWrapper";

        const thumb = document.createElement("img");
        thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(v.thumbnail)}`;
        thumb.style.cursor = "pointer";

        thumb.onclick = () => {
          increaseViews(v.id);

          const loader = document.createElement("div");
          loader.style.cssText = `
            position: absolute;
            inset: 0;
            border-radius: 8px;
            background: linear-gradient(90deg,#2a2a2a 25%,#3a3a3a 50%,#2a2a2a 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          `;
          wrapper.innerHTML = "";
          wrapper.appendChild(loader);

          const iframe = document.createElement("iframe");
          iframe.src = v.embed;
          iframe.allowFullscreen = true;
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "0";
          iframe.onload = () => loader.remove();

          wrapper.appendChild(iframe);
        };

        wrapper.appendChild(thumb);

        const title = document.createElement("h3");
        title.className = "videoTitle";
        title.textContent = v.title;
        title.onclick = () => { increaseViews(v.id); window.open(v.url, "_blank"); };

        const views = document.createElement("div");
        views.className = "views";
        const cachedViews = getCache("views_" + v.id);
        const cachedCycle = getCache("cycle_" + v.id);
        const initialViews = cachedViews ? Number(cachedViews) : 0;
        const initialCycle = cachedCycle ? Number(cachedCycle) : 0;
        views.textContent = `👁 ${formatViews(initialViews)}`;

        const btn = document.createElement("a");
        btn.className = "download";
        btn.href = v.url;
        btn.textContent = `Download (${v.size || "?"})`;
        btn.onclick = (e) => { e.preventDefault(); increaseViews(v.id); window.open(v.url, "_blank"); };

        box.appendChild(wrapper);
        box.appendChild(title);
        box.appendChild(views);
        box.appendChild(btn);
        normalContainer.appendChild(box);

        requestAnimationFrame(() => {
          box.style.opacity = 1;
          box.style.transform = "translateY(0)";
        });

        videoElements[v.id] = { box, views, totalViews: initialViews, cycleViews: initialCycle };

        onValue(ref(db, "views/" + v.id), snap => {
          videoElements[v.id].totalViews = snap.val() || 0;
          updateUI(v.id);
        });
        onValue(ref(db, "cycleViews/" + v.id), snap => {
          videoElements[v.id].cycleViews = Number(snap.val()) || 0;
          updateUI(v.id);
        });
      });
    })
    .catch(err => console.error("Failed to load videos:", err));
});
