import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue, set, runTransaction } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});

const db = getDatabase(app);

/* ---------------- VISIT ID ---------------- */
const VISIT_ID_KEY = "visit_id";

let visitId = localStorage.getItem(VISIT_ID_KEY);

if (!visitId) {
  visitId = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(VISIT_ID_KEY, visitId);
}

/* ---------------- URL PARAMS ---------------- */
const params = new URLSearchParams(window.location.search);
const videoId = params.get("video");
const qIndex = Number(params.get("q") || 0);

/* ---------------- ELEMENTS ---------------- */
const player = document.getElementById("player");
const titleEl = document.getElementById("title");
const qualityEl = document.getElementById("quality");
const watchLabel = document.getElementById("watchLabel");
const actionRow = document.getElementById("actionRow");

/* ---------------- STATE ---------------- */
let videoData = null;
let currentIndex = qIndex;

/* ---------------- PLAYER ---------------- */
function loadPlayer() {
  const q = videoData.qualities[currentIndex];
  player.innerHTML = `<iframe src="${q.embed}" allowfullscreen></iframe>`;
}

/* ---------------- BUTTONS (YOUR SYSTEM) ---------------- */
function injectButtons(video) {
  actionRow.innerHTML = "";

  /* ---------------- SHARE ---------------- */
  const shareBtn = document.createElement("button");
  shareBtn.innerHTML = `
<svg width="20" height="20" fill="white" viewBox="0 0 32 32">
<path d="M14 1L2 13l12 12V17c8 0 13 4 16 12-1-10-6-20-16-20V1z"/>
</svg>`;

  shareBtn.onclick = async () => {
    const url = `https://share.workfromanywhere-sa.workers.dev/?video=${video.id}`;

    if (navigator.share) {
      await navigator.share({ url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Copied!");
    }
  };

  /* ---------------- EMBED ---------------- */
  const embedBtn = document.createElement("button");
  embedBtn.innerHTML = `
<svg width="20" height="20" fill="white" viewBox="0 0 500 500">
<path d="M133 116L0 250l133 133h67L67 250l66-134h-0z"/>
</svg>`;

  embedBtn.onclick = () => {
    const q = video.qualities[currentIndex];
    const iframe = `<iframe src="${q.embed}" width="100%" height="300"></iframe>`;
    navigator.clipboard.writeText(iframe);
    alert("Embed copied!");
  };

  /* ---------------- DOWNLOAD ---------------- */
  const downloadBtn = document.createElement("button");
  downloadBtn.innerHTML = `
<svg width="20" height="20" fill="white" viewBox="0 0 475 475">
<path d="M224 323l127-128H73l127 128z"/>
</svg>`;

  downloadBtn.onclick = () => {
    const q = video.qualities[currentIndex];
    window.open(q.download, "_blank");
  };

  /* ---------------- LIKE SYSTEM (EXACT FIREBASE) ---------------- */
  const likeWrapper = document.createElement("div");
  likeWrapper.style.display = "flex";
  likeWrapper.style.alignItems = "center";
  likeWrapper.style.gap = "5px";

  const likeBtn = document.createElement("div");

  likeBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="20"
     height="20"
     viewBox="0 0 64 64"
     fill="none"
     stroke="white"
     stroke-width="3"
     id="likeIcon">
  <path d="M10 30c0-10 10-15 22-5c12-10 22-5 22 5c0 18-22 30-22 30S10 48 10 30z"/>
</svg>`;

  const likeCount = document.createElement("span");
  likeCount.textContent = "0";
  likeCount.style.fontSize = "10px";

  likeWrapper.appendChild(likeCount);
  likeWrapper.appendChild(likeBtn);

  const likeRef = ref(db, `likes/${video.id}/${visitId}`);

  likeBtn.onclick = () => {
    runTransaction(likeRef, (cur) => (cur ? null : true));
  };

  onValue(likeRef, (snap) => {
    const icon = likeBtn.querySelector("#likeIcon");

    if (snap.exists()) {
      icon.setAttribute("fill", "white");
    } else {
      icon.setAttribute("fill", "none");
    }
  });

  /* ---------------- APPEND ALL ---------------- */
  actionRow.appendChild(shareBtn);
  actionRow.appendChild(embedBtn);
  actionRow.appendChild(downloadBtn);
  actionRow.appendChild(likeWrapper);
}

/* ---------------- INIT ---------------- */
function init() {
  if (!videoId) {
    titleEl.textContent = "No video selected";
    return;
  }

  fetch("videos.json")
    .then(r => r.json())
    .then(videos => {

      videoData = videos.find(v => v.id === videoId);

      if (!videoData) {
        titleEl.textContent = "Video not found";
        return;
      }

      document.title = videoData.title;
      titleEl.textContent = videoData.title;

      watchLabel.textContent =
        `Watch "${videoData.title}" — streaming now in high quality`;

      document.getElementById("metaDesc").setAttribute(
        "content",
        `Watch ${videoData.title} — streaming now in high quality`
      );

      /* QUALITY */
      videoData.qualities.forEach((q, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = q.label;
        if (i === currentIndex) opt.selected = true;
        qualityEl.appendChild(opt);
      });

      qualityEl.onchange = () => {
        currentIndex = Number(qualityEl.value);
        loadPlayer();
      };

      loadPlayer();

      /* 🔥 INJECT YOUR BUTTONS HERE */
      injectButtons(videoData);
    })
    .catch(err => {
      console.error(err);
      titleEl.textContent = "Error loading video";
    });
}

init();
