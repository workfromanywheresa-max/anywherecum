import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */ 
const app = initializeApp({
  apiKey: "AIzaSyCEX...",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

const embedModal = document.createElement("div");
embedModal.style.position = "fixed";
embedModal.style.top = "0";
embedModal.style.left = "0";
embedModal.style.width = "100%";
embedModal.style.height = "100%";
embedModal.style.background = "rgba(0,0,0,0.85)";
embedModal.style.display = "none";
embedModal.style.alignItems = "center";
embedModal.style.justifyContent = "center";
embedModal.style.zIndex = "99999";

embedModal.innerHTML = `
  <div style="
    background:#111;
    width:90%;
    max-width:500px;
    padding:15px;
    border-radius:10px;
    color:white;
    position:relative;
  ">
    
    <!-- ❌ CLOSE BUTTON -->
    <button id="closeEmbedModal" style="
      position:absolute;
      top:10px;
      right:10px;
      background:transparent;
      border:none;
      color:white;
      font-size:20px;
      cursor:pointer;
    ">✕</button>

    <h3 style="margin-bottom:10px;">Embed Options</h3>
    <div id="embedContent"></div>
  </div>
`;

document.body.appendChild(embedModal);

embedModal.onclick = (e) => {
  if (e.target === embedModal) {
    embedModal.style.display = "none";
  }
};

document.addEventListener("click", (e) => {
  if (e.target.id === "closeEmbedModal") {
    embedModal.style.display = "none";
  }
});

window.addEventListener("popstate", () => {
  if (embedModal.style.display === "flex") {
    embedModal.style.display = "none";
    history.pushState(null, "");
  }
});

/* ---------------- DOWNLOAD MODAL ---------------- */
const downloadModal = document.createElement("div");
downloadModal.style.position = "fixed";
downloadModal.style.top = "0";
downloadModal.style.left = "0";
downloadModal.style.width = "100%";
downloadModal.style.height = "100%";
downloadModal.style.background = "rgba(0,0,0,0.85)";
downloadModal.style.display = "none";
downloadModal.style.alignItems = "center";
downloadModal.style.justifyContent = "center";
downloadModal.style.zIndex = "99999";

downloadModal.innerHTML = `
  <div style="
    background:#111;
    width:90%;
    max-width:500px;
    padding:15px;
    border-radius:10px;
    color:white;
    position:relative;
  ">
    <button id="closeDownloadModal" style="
      position:absolute;
      top:10px;
      right:10px;
      background:transparent;
      border:none;
      color:white;
      font-size:20px;
      cursor:pointer;
    ">✕</button>

    <h3 style="margin-bottom:10px;">Download Options</h3>
    <div id="downloadContent"></div>
  </div>
`;

document.body.appendChild(downloadModal);

/* close handlers */
document.addEventListener("click", (e) => {
  if (e.target.id === "closeDownloadModal") {
    downloadModal.style.display = "none";
  }
});

downloadModal.onclick = (e) => {
  if (e.target === downloadModal) {
    downloadModal.style.display = "none";
  }
};

/* ---------------- BACK BUTTON SUPPORT (DOWNLOAD MODAL) ---------------- */
window.addEventListener("popstate", () => {
  if (downloadModal.style.display === "flex") {
    downloadModal.style.display = "none";
    history.pushState(null, "");
  }
});

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
<svg xmlns="http://www.w3.org/2000/svg"
     width="26"
     height="12"
     viewBox="0 0 475.078 475.077"
     fill="white">
  <g>
    <path d="M467.083,318.627c-5.324-5.328-11.8-7.994-19.41-7.994H315.195l-38.828,38.827
    c-11.04,10.657-23.982,15.988-38.828,15.988c-14.843,0-27.789-5.324-38.828-15.988l-38.543-38.827H27.408
    c-7.612,0-14.083,2.669-19.414,7.994C2.664,323.955,0,330.427,0,338.044v91.358c0,7.614,2.664,14.085,7.994,19.414
    c5.33,5.328,11.801,7.99,19.414,7.99h420.266c7.61,0,14.086-2.662,19.41-7.99c5.332-5.329,7.994-11.8,7.994-19.414v-91.358
    C475.078,330.427,472.416,323.955,467.083,318.627z"/>
    <path d="M224.692,323.479c3.428,3.613,7.71,5.421,12.847,5.421c5.141,0,9.418-1.808,12.847-5.421l127.907-127.908
    c5.899-5.519,7.234-12.182,3.997-19.986c-3.23-7.421-8.847-11.132-16.844-11.136h-73.091V36.543
    c0-4.948-1.811-9.231-5.421-12.847c-3.62-3.617-7.901-5.426-12.847-5.426h-73.096c-4.946,0-9.229,1.809-12.847,5.426
    c-3.615,3.616-5.424,7.898-5.424,12.847V164.45h-73.089c-7.998,0-13.61,3.715-16.846,11.136
    c-3.234,7.801-1.903,14.467,3.999,19.986L224.692,323.479z"/>
  </g>
</svg>
`;

  const downloadBox = document.createElement("div");
  downloadBox.style.display = "none";

  const embedBtn = document.createElement("button");
embedBtn.className = "embedBtn";

/* use image like download button */
embedBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="26"
     height="12"
     viewBox="0 0 500 500"
     fill="white">
  <path d="M133.333,116.667L0,250l133.333,133.333H200L66.667,250L200,116.667H133.333z
           M366.667,116.667H300L433.333,250L300,383.333h66.667L500,250L366.667,116.667z"/>
</svg>
`;
  
embedBtn.style.marginBottom = "0px";

/* ---------------- COPY SVG ---------------- */
function copySVG() {
  return `
  <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" width="12" height="12">
    <rect x="3" y="5" width="13" height="13" rx="2"></rect>
    <rect x="9" y="1" width="13" height="13" rx="2"></rect>
  </svg>`;
}

  /* ---------------- EMBED LINKS (COPY ICON RIGHT SIDE) ---------------- */
embedBtn.onclick = () => {

  downloadBox.style.display = "none";

  const isOpen = embedModal.style.display === "flex";

  if (isOpen) {
    embedModal.style.display = "none";
    return;
  }

  const container = document.getElementById("embedContent");
  container.innerHTML = "";

  video.qualities.forEach(q => {

  const block = document.createElement("div");
  block.style.marginBottom = "15px";

  const label = document.createElement("div");
  label.textContent = q.label;
  label.style.fontSize = "12px";
  label.style.marginBottom = "5px";
  label.style.color = "#aaa";

  const iframeCode = `<iframe src="${q.embed}" width="100%" height="300" frameborder="0" allowfullscreen></iframe>`;

  /* 👇 PASTE YOUR WRAPPER CODE HERE */
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "100%";

  const textarea = document.createElement("textarea");
  textarea.style.width = "100%";
  textarea.style.height = "90px";
  textarea.style.background = "#000";
  textarea.style.color = "#0f0";
  textarea.style.border = "1px solid #333";
  textarea.style.padding = "8px";
  textarea.style.fontSize = "12px";
  textarea.value = iframeCode;
  textarea.readOnly = true;

  const btn = document.createElement("div");
  btn.style.position = "absolute";
  btn.style.top = "6px";
  btn.style.right = "6px";
  btn.style.cursor = "pointer";
  btn.style.zIndex = "10";

  const icon = document.createElement("div");
  icon.innerHTML = copySVG();

  icon.style.width = "28px";
  icon.style.height = "28px";
  icon.style.display = "flex";
  icon.style.alignItems = "center";
  icon.style.justifyContent = "center";
  icon.style.background = "rgba(0,0,0,0.6)";
  icon.style.borderRadius = "6px";

  icon.onclick = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);

      icon.style.background = "#00c853";
      setTimeout(() => {
        icon.style.background = "rgba(0,0,0,0.6)";
      }, 800);

    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  btn.appendChild(icon);

  wrapper.appendChild(textarea);
  wrapper.appendChild(btn);

  block.appendChild(label);
  block.appendChild(wrapper);

  container.appendChild(block);
});

  embedModal.style.display = "flex";
  history.pushState({ embedOpen: true }, "");
};

/* ---------------- TOGGLE EMBED BOX ---------------- */
const donateBtn = document.createElement("button");
donateBtn.className = "donateBtn";

donateBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="12" fill="white" viewBox="0 0 640 640">
  <path d="M320 48C306.7 48 296 58.7 296 72L296 84L294.2 84C257.6 84 228 113.7 228 150.2C228 183.6 252.9 211.8 286 215.9L347 223.5C352.1 224.1 356 228.5 356 233.7C356 239.4 351.4 243.9 345.8 243.9L272 244C256.5 244 244 256.5 244 272C244 287.5 256.5 300 272 300L296 300L296 312C296 325.3 306.7 336 320 336C333.3 336 344 325.3 344 312L344 300L345.8 300C382.4 300 412 270.3 412 233.8C412 200.4 387.1 172.2 354 168.1L293 160.5C287.9 159.9 284 155.5 284 150.3C284 144.6 288.6 140.1 294.2 140.1L360 140C375.5 140 388 127.5 388 112C388 96.5 375.5 84 360 84L344 84L344 72C344 58.7 333.3 48 320 48zM141.3 405.5L98.7 448L64 448C46.3 448 32 462.3 32 480L32 544C32 561.7 46.3 576 64 576L384.5 576C413.5 576 441.8 566.7 465.2 549.5L591.8 456.2C609.6 443.1 613.4 418.1 600.3 400.3C587.2 382.5 562.2 378.7 544.4 391.8L424.6 480L312 480C298.7 480 288 469.3 288 456C288 442.7 298.7 432 312 432L384 432C401.7 432 416 417.7 416 400C416 382.3 401.7 368 384 368L231.8 368C197.9 368 165.3 381.5 141.3 405.5z"/>
</svg>
`;

donateBtn.onclick = () => {

  // 🔥 CLOSE OPEN BOXES FIRST
  embedModal.style.display = "none";
  downloadBox.style.display = "none";

  window.location.href = "donate.html";
};
    
  /* ---------------- SHARE BUTTON ---------------- */
const shareBtn = document.createElement("button");
shareBtn.className = "shareBtn";

/* use image like others */
shareBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="26"
     height="12"
     viewBox="0 0 32 32"
     fill="white">

  <g transform="translate(16 16) scale(-1,1) translate(-16 -16)">
    <path d="M14.0068 1.0898C14.0062 0.1649 12.9319 -0.2991 12.3015 0.3533L0.9798 12.0682C0.5876 12.474 0.5868 13.134 0.978 13.5408L12.2917 25.3071C12.9217 25.9623 13.9988 25.4982 13.9988 24.5717V17.1611C13.9988 16.5868 13.5511 16.1211 12.9988 16.1211C12.4465 16.1211 11.9988 16.5868 11.9988 17.1611V24.5717L2.3922 12.0701L11.9988 7.8941V13.5427L13.7121 1.8278L12.0068 1.0913V7.8941C12.0068 8.4685 12.4473 8.9338 12.9996 8.9333C13.5518 8.9329 13.9992 8.467 13.9988 7.8926L14.0068 1.0898Z"/>

    <path d="M19 8.9832C26 9 29.9701 13 30 18V31.0079L31.9843 30.8234C31.911 30.4152 31.7394 29.7368 31.4375 28.8765C30.9375 27.4523 29 15.9933 20.1003 15.9933H13.1C12.5477 15.9933 12.1 16.441 12.1 16.9933C12.1 17.5456 12.5477 17.9933 13.1 17.9933H19C26.9212 17.9933 29.1066 28.2747 29.5503 29.5389C29.7052 29.9802 29.827 30.3885 29.919 30.7524C29.9726 30.9642 30.0037 31.1094 30.0157 31.1766C30.232 32.3821 32.0097 32.2168 32 30.9921V18C32 10.2746 26 7 19 8.9832Z"/>
  </g>

</svg>
`;
  
/* fallback box (desktop only) */
const shareBox = document.createElement("div");
shareBox.style.display = "none";

/* native share */
shareBtn.onclick = async () => {

  // 🔥 CLOSE OPEN BOXES FIRST
  embedModal.style.display = "none";
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

  embedModal.style.display = "none";

  const container = document.getElementById("downloadContent");
  container.innerHTML = "";

  video.qualities.forEach(q => {

    const link = document.createElement("a");
    link.href = q.download;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    link.textContent = `${q.label} • ${q.size}`;

    link.style.display = "block";
    link.style.padding = "10px";
    link.style.marginBottom = "8px";
    link.style.background = "#222";
    link.style.borderRadius = "6px";
    link.style.color = "#ff4444";
    link.style.textDecoration = "none";

    link.onclick = () => countDownloadOnce(video.id);

    container.appendChild(link);
  });

  downloadModal.style.display = "flex";
history.pushState({ downloadOpen: true }, "");
};

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
actionBox.appendChild(shareBox);

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
