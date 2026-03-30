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

/* ---------------- LOADER ---------------- */
// Reduced size for video box
const videoBoxWidth = 600; // Smaller width
const videoBoxHeight = 169; // Adjusted height based on 16:9 aspect ratio

// Function to create a loader with a fixed size
function createLoader() {
  const loader = document.createElement("div");
  loader.id = "loader";
  loader.style.position = "fixed";
  loader.style.top = "50%";
  loader.style.left = "50%";
  loader.style.transform = "translate(-50%, -50%)";
  loader.style.zIndex = "9999";
  loader.style.display = "flex";
  loader.style.justifyContent = "center";
  loader.style.alignItems = "center";
  loader.style.width = `${videoBoxWidth}px`; // Fixed width for the loader
  loader.style.height = `${videoBoxHeight}px`; // Fixed height for the loader

  const spinner = document.createElement("div");
  spinner.style.border = "4px solid rgba(255, 255, 255, 0.3)";
  spinner.style.borderTop = "4px solid #ffcc00";
  spinner.style.borderRadius = "50%";
  spinner.style.width = "50px"; // Fixed size of the spinner
  spinner.style.height = "50px";
  spinner.style.animation = "spin 1s linear infinite";
  
  loader.appendChild(spinner);
  
  // Append the loader to the body
  document.body.appendChild(loader);
}

// Remove the loader element
function removeLoader() {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.remove();
  }
}

// Add spinner animation CSS dynamically
const style = document.createElement('style');
style.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Function to create a video box with auto width and reduced sizes
function createVideoBox(video) {
  const box = document.createElement("div");
  box.className = "videoBox"; // Add the class for styling
  box.style.height = `${videoBoxHeight + 60}px`; // Fixed height for the video box (plus some space for text)
  
  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";
  wrapper.style.width = "100%";
  wrapper.style.maxWidth = `${videoBoxWidth}px`; // Fixed width for the video wrapper
  wrapper.style.aspectRatio = "16/9"; // Maintain 16:9 aspect ratio
  
  const thumb = document.createElement("img");
  thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(video.thumbnail)}`;
  thumb.onclick = () => {
    increaseViews(video.id);
    const iframe = document.createElement("iframe");
    iframe.src = video.embed;
    iframe.allowFullscreen = true;
    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);
  };
  wrapper.appendChild(thumb);

  const title = document.createElement("h3");
  title.className = "videoTitle";
  title.textContent = video.title;
  title.onclick = () => { increaseViews(video.id); window.open(video.url, "_blank"); };

  const views = document.createElement("div");
  views.className = "views";
  views.textContent = `👁 ${formatViews(video.totalViews)}`;

  const btn = document.createElement("a");
  btn.className = "download";
  btn.href = "#";
  btn.textContent = `Download (${video.size || "?"})`;
  btn.onclick = (e) => { e.preventDefault(); increaseViews(video.id); window.open(video.url, "_blank"); };

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

  // Remove box first
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

  const newText = isTrending ? `🔥 Trending | 👁 ${formatViews(total)}` : `👁 ${formatViews(total)}`;
  if (v.views.textContent !== newText) {
    v.views.textContent = newText;
    v.views.style.color = isTrending ? "#ffcc00" : "#aaa";
  }
}

/* ---------------- LOAD VIDEOS ---------------- */
createLoader();  // Show loader before the fetch

fetch(dataSource)
  .then(res => res.json())
  .then(videos => {
    removeLoader();  // Hide loader after the videos are loaded

    const filtered = folderName
      ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
      : videos;

    filtered.forEach((v, index) => {
      const box = createVideoBox(v); // Create a video box for each video

      videosContainer.appendChild(box);

      // store video info including original position
      videoElements[v.id] = {
        box,
        views: box.querySelector(".views"),
        totalViews: v.totalViews || 0,
        cycleViews: v.cycleViews || 0,
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
    setTimeout(() => {
      Object.keys(videoElements).forEach(id => {
        if (videoElements[id].cycleViews >= 10) {
          updateUI(id);
        }
      });
    }, 50); // slight delay ensures DOM is fully rendered
  })
  .catch(error => {
    console.error("Error loading videos:", error);
    removeLoader();  // Hide loader if an error occurs
  });
