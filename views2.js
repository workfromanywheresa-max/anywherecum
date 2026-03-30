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
document.getElementById("folderTitle").textContent = folderName ? toTitleCase(folderName) : "🔐VIP Exclusive";

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
  } catch (err) { console.error("Worker failed:", err); }
}
function increaseViews(videoId) { if (!TEST_MODE) sendToWorker("clicked_" + videoId); }

/* ---------------- CONTAINER ---------------- */
const videosContainer = document.getElementById("normalVideos");
const videoElements = {};

/* ---------------- UI UPDATE ---------------- */
function updateUI(id) {
  const v = videoElements[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, cycle);

  const isTrending = cycle >= 10;

  // Add the "moving" class for smooth animation
  if (v.box.parentElement === videosContainer) {
    v.box.classList.add('moving');
  }

  // Wait for the animation to complete before actually moving the element
  v.box.addEventListener('transitionend', () => {
    // Once the animation ends, apply the DOM movement
    if (v.box.parentElement === videosContainer) {
      videosContainer.removeChild(v.box);
    }

    if (isTrending) {
      // Move trending videos to top
      videosContainer.insertBefore(v.box, videosContainer.firstChild);
    } else {
      // Return to original position if below 10
      if (v.originalIndex >= videosContainer.children.length) {
        videosContainer.appendChild(v.box);
      } else {
        videosContainer.insertBefore(v.box, videosContainer.children[v.originalIndex]);
      }
    }

    // Remove the "moving" class after the transition ends
    v.box.classList.remove('moving');
  });

  const newText = isTrending ? `🔥 Trending | 👁 ${formatViews(total)}` : `👁 ${formatViews(total)}`;
  if (v.views.textContent !== newText) {
    v.views.textContent = newText;
    v.views.style.color = isTrending ? "#ffcc00" : "#aaa";
  }
}

/* ---------------- LOAD VIDEOS ---------------- */
fetch(dataSource)
  .then(res => res.json())
  .then(videos => {
    const filtered = folderName
      ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
      : videos;

    filtered.forEach((v, index) => {
      const box = document.createElement("div");
      box.className = "videoBox";

      const wrapper = document.createElement("div");
      wrapper.className = "videoFrameWrapper";

      const thumb = document.createElement("img");
      thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(v.thumbnail)}`;
      thumb.onclick = () => {
        increaseViews(v.id);
        const iframe = document.createElement("iframe");
        iframe.src = v.embed;
        iframe.allowFullscreen = true;
        wrapper.innerHTML = "";
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

      let initialViews = cachedViews ? Number(cachedViews) : 0;
      let initialCycle = cachedCycle ? Number(cachedCycle) : 0;

      views.textContent = `👁 ${formatViews(initialViews)}`;

      const btn = document.createElement("a");
      btn.className = "download";
      btn.href = "#";
      btn.textContent = `Download (${v.size || "?"})`;
      btn.onclick = (e) => { e.preventDefault(); increaseViews(v.id); window.open(v.url, "_blank"); };

      box.appendChild(wrapper);
      box.appendChild(title);
      box.appendChild(views);
      box.appendChild(btn);

      videosContainer.appendChild(box);

      // store video info including original position
      videoElements[v.id] = {
        box,
        views,
        totalViews: initialViews,
        cycleViews: initialCycle,
        originalIndex: index
      };

      // FIREBASE LISTENERS
      onValue(ref(db, "views/" + v.id), snap => {
        videoElements[v.id].totalViews = snap.val() || 0;
        updateUI(v.id);
      });
      onValue(ref(db, "cycleViews/" + v.id), snap => {
        videoElements[v.id].cycleViews = Number(snap.val()) || 0;
        updateUI(v.id);
      });
    });

    // ---------------- POST-LOAD TRENDING ----------------
    // Move cached trending videos to top smoothly
    setTimeout(() => {
      Object.keys(videoElements).forEach(id => {
        if (videoElements[id].cycleViews >= 10) {
          updateUI(id);
        }
      });
    }, 50); // slight delay ensures DOM is fully rendered
  });
