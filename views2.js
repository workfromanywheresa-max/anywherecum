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

/* ---------------- VISIT TRACKING ---------------- */
const VISIT_ID_KEY = "visit_id";

let visitId = localStorage.getItem(VISIT_ID_KEY);

if (!visitId) {
  visitId = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(VISIT_ID_KEY, visitId);
}

/* ---------------- CONFIG ---------------- */
const urlParams = new URLSearchParams(window.location.search);
const folderName = (urlParams.get("folder") || "").trim().toLowerCase();
const rawFolderName = (urlParams.get("folder") || "").trim();
const videoIdFromURL = urlParams.get("video");
const config = window.VIDEO_CONFIG || {};
const dataSource = config.dataSource || "videos.json";

/* ---------------- CACHE ---------------- */
const cache = {};
const ORDER_KEY = "video_order";

function saveCache(key, value) {
  cache[key] = value;
  localStorage.setItem(key, value);
}

function getCache(key) {
  return cache[key] || localStorage.getItem(key);
}

/* ---------------- STATE ---------------- */
const videoDataMap = {};
const videoElements = {};
let currentPreviewVideo = null;

/* ---------------- STOP VIDEO ---------------- */
function stopVideo(video) {
  if (!video) return;
  video.pause();
  video.currentTime = 0;
}

/* ---------------- OBSERVER ---------------- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) {
      stopVideo(entry.target);
    }
  });
}, { threshold: 0.3 });

/* ---------------- TITLE ---------------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const titleEl = document.getElementById("folderTitle");

if (titleEl) {
  const normalized = rawFolderName.toLowerCase();

  if (normalized === "🔒vip exclusive") {
    titleEl.textContent = "💎VIP Exclusive";
  } else {
    titleEl.textContent = rawFolderName ? toTitleCase(rawFolderName) : "All Videos";
  }
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
  } catch (err) {
    console.error("Worker failed:", err);
  }
}

function increaseViews(videoId) {
  if (!TEST_MODE) sendToWorker("clicked_" + videoId);
}

/* ---------------- COUNTING ---------------- */
function countWatchOnce(videoId) {
  const key = `${visitId}_watch_${videoId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  increaseViews(videoId);
}

function countDownloadOnce(videoId) {
  const key = `${visitId}_download_${videoId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  increaseViews(videoId);
}

/* ---------------- CONTAINER ---------------- */
const videosContainer = document.getElementById("normalVideos");

function scrollToVideoFromHash() {
  const hash = window.location.hash;

  if (!hash) return;

  const el = document.querySelector(hash);

  if (el) {
    setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 500);
  }
}

/* ---------------- PER VIDEO LOADER STYLE ---------------- */
const style = document.createElement("style");
style.innerHTML = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;
document.head.appendChild(style);

/* ---------------- VIDEO BOX ---------------- */
function createVideoBox(video) {

  const box = document.createElement("div");
box.className = "videoBox";
box.id = `video-${video.id}`; // ✅ ADD THIS HERE
  
  const wrapper = document.createElement("div");
  wrapper.className = "videoFrameWrapper";
  wrapper.style.position = "relative";

  /* ---------------- LOADER ---------------- */
  const loader = document.createElement("div");
  loader.style.position = "absolute";
  loader.style.top = "0";
  loader.style.left = "0";
  loader.style.width = "100%";
  loader.style.height = "100%";
  loader.style.display = "flex";
  loader.style.alignItems = "center";
  loader.style.justifyContent = "center";
  loader.style.background = "rgba(0,0,0,0.4)";
  loader.style.zIndex = "5";

  const spinner = document.createElement("div");
  spinner.style.border = "3px solid rgba(255,255,255,0.3)";
  spinner.style.borderTop = "3px solid #ffcc00";
  spinner.style.borderRadius = "50%";
  spinner.style.width = "35px";
  spinner.style.height = "35px";
  spinner.style.animation = "spin 1s linear infinite";

  loader.appendChild(spinner);
  wrapper.appendChild(loader);

  const defaultQuality =
    video.qualities.find(q => q.label.includes("480")) ||
    video.qualities[0];

  let currentEmbed = defaultQuality.embed;

  function loadPlayer() {
    if (wrapper.dataset.loaded === "true") return;
    wrapper.dataset.loaded = "true";

    loader.style.display = "flex";

    const iframe = document.createElement("iframe");
    iframe.src = currentEmbed;
    iframe.allowFullscreen = true;

    iframe.onload = () => {
      loader.style.display = "none";
    };

    wrapper.replaceChildren(loader, iframe);
  }

  const preview = document.createElement("video");
  preview.src = video.preview;
  preview.muted = true;
  preview.loop = true;
  preview.playsInline = true;
  preview.preload = "metadata";
  preview.style.width = "100%";
  preview.style.height = "100%";
  preview.style.objectFit = "container";

  observer.observe(preview);

  preview.addEventListener("loadeddata", () => {
    loader.style.display = "none";
  });

  preview.addEventListener("canplay", () => {
  preview.currentTime = 0.1;
}, { once: true });

  preview.onclick = async () => {
  countWatchOnce(video.id);

  /* 🔥 SEND TO NEW WORKER ON CLICK */
try {
  setTimeout(async () => {
    const res = await fetch("https://task.workfromanywhere-sa.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: video.id,
        type: "preview_click",
        visitId: visitId,
        timestamp: Date.now()
      })
    });
  }, 5 * 60 * 1000); // 5 minutes delay

} catch (err) {
  console.error("Task worker failed:", err);
}
  
  loadPlayer();
};

  let startX = 0;

  preview.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  preview.addEventListener("touchend", e => {
    const diff = Math.abs(e.changedTouches[0].clientX - startX);

    if (diff > 30) {
      if (currentPreviewVideo && currentPreviewVideo !== preview) {
        stopVideo(currentPreviewVideo);
      }

      if (!preview.paused) {
        stopVideo(preview);
      } else {
        preview.play().catch(() => {});
        currentPreviewVideo = preview;
      }
    }
  });

  wrapper.appendChild(preview);

  const views = document.createElement("div");
  views.className = "views";
  views.style.position = "absolute";
  views.style.bottom = "8px";
  views.style.left = "8px";
  views.style.background = "rgba(0,0,0,0.6)";
  views.style.padding = "4px 8px";
  views.style.borderRadius = "6px";
  views.style.fontSize = "12px";

  wrapper.appendChild(views);

  const select = document.createElement("select");

  video.qualities.forEach((q, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `Stream - ${q.label}`;
    if (q === defaultQuality) option.selected = true;
    select.appendChild(option);
  });

  select.onchange = () => {
    const selected = video.qualities[select.value];
    currentEmbed = selected.embed;

    countWatchOnce(video.id);

    wrapper.dataset.loaded = "false";
    loadPlayer();
  };

  const title = document.createElement("h3");
  title.className = "videoTitle";
  title.textContent = video.title;

  const downloadBtn = document.createElement("button");
downloadBtn.className = "downloadBtn";

/* make it behave like your donate button */
downloadBtn.innerHTML = `
  <img src="https://anywherecum.pages.dev/images/download.png"
       width="30"
       height="12"
       style="display:block;">
`;

  const downloadBox = document.createElement("div");
  downloadBox.style.display = "none";

  const embedBtn = document.createElement("button");
embedBtn.className = "embedBtn";

/* use image like download button */
embedBtn.innerHTML = `
  <img src="https://anywherecum.pages.dev/images/embed.png"
       width="30"
       height="12"
       style="display:block;">
`;
  
embedBtn.style.marginBottom = "0px";

const embedBox = document.createElement("div");

/* ✅ START HIDDEN */
embedBox.style.display = "none";

/* layout style (applies when shown) */
embedBox.style.flexDirection = "column";
embedBox.style.gap = "0px";

/* ---------------- COPY SVG ---------------- */
function copySVG() {
  return `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
    <rect x="3" y="5" width="13" height="13" rx="2"></rect>
    <rect x="9" y="1" width="13" height="13" rx="2"></rect>
  </svg>`;
}

  /* ---------------- EMBED LINKS (COPY ICON RIGHT SIDE) ---------------- */
video.qualities.forEach(q => {
  if (!q.label.includes("480") && !q.label.includes("1080")) return;

  const link = document.createElement("div");

  link.style.display = "flex";
  link.style.alignItems = "center";
  link.style.justifyContent = "space-between";
  link.style.gap = "6px";
  link.style.color = "#ff4444";
  link.style.fontSize = "10px";
  link.style.wordBreak = "break-all";
  link.style.cursor = "pointer";
  link.style.width = "100%";

  const text = document.createElement("span");
  text.textContent = `${q.label} • ${q.embed}`;

  const icon = document.createElement("span");
  icon.innerHTML = copySVG();
  icon.style.display = "flex";

  link.appendChild(text);
  link.appendChild(icon);

  icon.onclick = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(q.embed);
  };

  embedBox.appendChild(link);
});

/* ---------------- TOGGLE EMBED BOX ---------------- */
embedBtn.onclick = () => {

  // ❌ close download box if open
  downloadBox.style.display = "none";

  // toggle embed box
  embedBox.style.display =
    embedBox.style.display === "none" ? "flex" : "none";
};

const donateBtn = document.createElement("button");
donateBtn.className = "donateBtn";

donateBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="30" height="12" fill="white" viewBox="0 0 640 640">
  <path d="M320 48C306.7 48 296 58.7 296 72L296 84L294.2 84C257.6 84 228 113.7 228 150.2C228 183.6 252.9 211.8 286 215.9L347 223.5C352.1 224.1 356 228.5 356 233.7C356 239.4 351.4 243.9 345.8 243.9L272 244C256.5 244 244 256.5 244 272C244 287.5 256.5 300 272 300L296 300L296 312C296 325.3 306.7 336 320 336C333.3 336 344 325.3 344 312L344 300L345.8 300C382.4 300 412 270.3 412 233.8C412 200.4 387.1 172.2 354 168.1L293 160.5C287.9 159.9 284 155.5 284 150.3C284 144.6 288.6 140.1 294.2 140.1L360 140C375.5 140 388 127.5 388 112C388 96.5 375.5 84 360 84L344 84L344 72C344 58.7 333.3 48 320 48zM141.3 405.5L98.7 448L64 448C46.3 448 32 462.3 32 480L32 544C32 561.7 46.3 576 64 576L384.5 576C413.5 576 441.8 566.7 465.2 549.5L591.8 456.2C609.6 443.1 613.4 418.1 600.3 400.3C587.2 382.5 562.2 378.7 544.4 391.8L424.6 480L312 480C298.7 480 288 469.3 288 456C288 442.7 298.7 432 312 432L384 432C401.7 432 416 417.7 416 400C416 382.3 401.7 368 384 368L231.8 368C197.9 368 165.3 381.5 141.3 405.5z"/>
</svg>
`;

donateBtn.onclick = () => {

  // 🔥 CLOSE OPEN BOXES FIRST
  embedBox.style.display = "none";
  downloadBox.style.display = "none";

  window.location.href = "donate.html";
};
    
  /* ---------------- SHARE BUTTON ---------------- */
const shareBtn = document.createElement("button");
shareBtn.className = "shareBtn";

/* use image like others */
shareBtn.innerHTML = `
  <img src="https://anywherecum.pages.dev/images/share.png"
       width="30"
       height="12"
       style="display:block;">
`;
  
/* fallback box (desktop only) */
const shareBox = document.createElement("div");
shareBox.style.display = "none";

/* native share */
shareBtn.onclick = async () => {

  // 🔥 CLOSE OPEN BOXES FIRST
  embedBox.style.display = "none";
  downloadBox.style.display = "none";

  const shareUrl = `https://share.workfromanywhere-sa.workers.dev/?video=${video.id}`;

  if (navigator.share) {
    try {
      await navigator.share({
        url: shareUrl
      });

      increaseViews(video.id);

    } catch (err) {
      console.log("Share cancelled");
    }
  } else {
    shareBox.innerHTML = `
      <input value="${shareUrl}" readonly style="width:90%;padding:5px;">
      <button onclick="navigator.clipboard.writeText('${shareUrl}')">
        Copy Link
      </button>
    `;
    shareBox.style.display =
      shareBox.style.display === "none" ? "block" : "none";
  }
};

  downloadBtn.onclick = () => {

  // ❌ close embed box if open
  embedBox.style.display = "none";

  // toggle download box
  downloadBox.style.display =
    downloadBox.style.display === "none" ? "block" : "none";

  countDownloadOnce(video.id);
};

  video.qualities.forEach(q => {
    const link = document.createElement("a");
    link.href = q.download;
    link.target = "_blank";
    link.textContent = `${q.label} • ${q.size}`;
    link.style.display = "block";
    link.style.color = "#ff4444";

    link.onclick = () => countDownloadOnce(video.id);

    downloadBox.appendChild(link);
  });

  box.appendChild(select);
  box.appendChild(wrapper);
  box.appendChild(title);

  const actionBox = document.createElement("div");
actionBox.style.display = "flex";
actionBox.style.flexDirection = "column";
actionBox.style.alignItems = "center";
actionBox.style.gap = "5px";

/* buttons row */
const btnRow = document.createElement("div");
btnRow.style.display = "flex";
btnRow.style.gap = "10px";

btnRow.appendChild(shareBtn);
btnRow.appendChild(embedBtn);
btnRow.appendChild(downloadBtn);
btnRow.appendChild(donateBtn); // ✅ ADD THIS LINE
  
actionBox.appendChild(btnRow);
actionBox.appendChild(downloadBox);
actionBox.appendChild(shareBox);
actionBox.appendChild(embedBox);

box.appendChild(actionBox);
  
  return box;
}

/* ---------------- UI UPDATE (TRENDING LOGIC HERE) ---------------- */
function updateUI(id) {
  const v = videoDataMap[id];
  if (!v || !videoElements[id]) return;

  const total = v.totalViews || 0;

  /* 🔥 TRENDING RULE */
  const isTrending = v.cycleViews >= 10;

  saveCache("views_" + id, total);
  saveCache("cycle_" + id, v.cycleViews);

  const text = isTrending
    ? `🔥 Trending | 👁 ${formatViews(total)}`
    : `👁 ${formatViews(total)}`;

  const el = videoElements[id].views;

  if (el.textContent !== text) {
    requestAnimationFrame(() => {
      el.textContent = text;
      el.style.color = isTrending ? "#ffcc00" : "#fff";
    });
  }
}

/* ---------------- REORDER (TRENDING PRIORITY) ---------------- */
function reorderVideos(force = false) {
  const entries = Object.entries(videoDataMap);

  entries.sort((a, b) => {
    const A = a[1];
    const B = b[1];

    const ATrending = A.cycleViews >= 10;
    const BTrending = B.cycleViews >= 10;

    if (ATrending && !BTrending) return -1;
    if (!ATrending && BTrending) return 1;

    if (ATrending && BTrending) {
      return B.cycleViews - A.cycleViews;
    }

    return A.originalIndex - B.originalIndex;
  });

  const newOrder = entries.map(([id]) => id);
  const oldOrder = JSON.parse(getCache(ORDER_KEY) || "[]");

  if (!force && JSON.stringify(newOrder) === JSON.stringify(oldOrder)) return;

  saveCache(ORDER_KEY, JSON.stringify(newOrder));

  newOrder.forEach(id => {
    const el = videoElements[id]?.box;
    if (el) videosContainer.appendChild(el);
  });
}

/* ---------------- LOAD ---------------- */
fetch(dataSource)
  .then(res => res.json())
  .then(videos => {

    const filtered = folderName
      ? videos.filter(v =>
          (v.folder || "").trim().toLowerCase() === folderName
        )
      : videos;

    if (filtered.length === 0) {
      videosContainer.innerHTML = "<p>No videos found.</p>";
      return;
    }

    filtered.forEach((v, index) => {

      videoDataMap[v.id] = {
        ...v,
        originalIndex: index,
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
    });

    if (videoIdFromURL) {

  const waitForData = setInterval(() => {
    const v = videoDataMap[videoIdFromURL];

    if (v) {
      clearInterval(waitForData);

      document.title = v.title;

      const setMeta = (property, content) => {
        let tag = document.querySelector(`meta[property='${property}']`);
        if (!tag) {
          tag = document.createElement("meta");
          tag.setAttribute("property", property);
          document.head.appendChild(tag);
        }
        tag.setAttribute("content", content);
      };

      setMeta("og:title", v.title);
      setMeta("og:image", v.thumbnail);
      setMeta("og:url", window.location.href);
      setMeta("og:type", "video.other");
    }
  }, 100);
    }

  reorderVideos(true);

scrollToVideoFromHash(); 

    /* ---------------- AUTO OPEN SHARED VIDEO ---------------- */
    if (videoIdFromURL) {
  const target = videoElements[videoIdFromURL];

  if (target) {
    target.box.scrollIntoView({ behavior: "smooth", block: "center" });

    const preview = target.box.querySelector("video");

    if (preview) {

  preview.load(); // force load

  const showFirstFrame = () => {
    preview.currentTime = 0.1;

    // 🔥 FORCE RENDER FRAME (this is the missing part)
    preview.play()
      .then(() => {
        preview.pause();
      })
      .catch(() => {});
  };

  preview.addEventListener("loadeddata", showFirstFrame, { once: true });

  if (preview.readyState >= 2) {
    showFirstFrame();
  }
    }
  }
    }

    filtered.forEach(v => {

      onValue(ref(db, "views/" + v.id), snap => {
        const val = snap.val();
        if (val !== null) {
          videoDataMap[v.id].totalViews = val;
          updateUI(v.id);
        }
      });

      onValue(ref(db, "cycleViews/" + v.id), snap => {
        const val = snap.val();
        if (val !== null) {
          videoDataMap[v.id].cycleViews = Number(val);
          updateUI(v.id);
          reorderVideos();
        }
      });

    });

  })
  .catch(console.error);
