import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});

const db = getDatabase(app);

/* ---------------- VISIT ID ---------------- */
let visitId = localStorage.getItem("visit_id");

if (!visitId) {
  visitId = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("visit_id", visitId);
}

/* ---------------- URL ---------------- */
const params = new URLSearchParams(window.location.search);
const videoId = params.get("video");
let currentIndex = Number(params.get("q") || 0);

/* ---------------- ELEMENTS ---------------- */
const player = document.getElementById("player");
const titleEl = document.getElementById("title");
const qualityEl = document.getElementById("quality");
const watchLabel = document.getElementById("watchLabel");
const actionRow = document.getElementById("actionRow");
const metaDesc = document.getElementById("metaDesc");

let videoData = null;

/* ---------------- TIME AGO ---------------- */
function timeAgo(dateString) {
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diff = now - past;

  if (isNaN(past)) return "";

  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  if (hr < 24) return `${hr}h`;
  if (day < 7) return `${day}d`;

  return new Date(dateString).toLocaleDateString();
}

/* ---------------- PLAYER ---------------- */
function loadPlayer() {
  const q = videoData.qualities[currentIndex];
  player.innerHTML = `<iframe src="${q.embed}" allowfullscreen></iframe>`;
}

/* ---------------- STACK UI ---------------- */
function createStack(labelText, button) {
  const stack = document.createElement("div");
  stack.style.display = "flex";
  stack.style.flexDirection = "column";
  stack.style.alignItems = "center";
  stack.style.justifyContent = "center";
  stack.style.gap = "2px";
  stack.style.minWidth = "55px";

  const label = document.createElement("div");
  label.textContent = labelText;
  label.style.fontSize = "10px";
  label.style.color = "#aaa";

  button.style.width = "46px";
  button.style.height = "28px";
  button.style.border = "1px solid white";
  button.style.borderRadius = "6px";
  button.style.background = "transparent";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";

  stack.appendChild(label);
  stack.appendChild(button);

  return stack;
}

/* ---------------- MODALS ---------------- */
const embedModal = document.createElement("div");
embedModal.style.cssText = `
position:fixed;top:0;left:0;width:100%;height:100%;
background:rgba(0,0,0,0.85);display:none;
align-items:center;justify-content:center;z-index:99999;
`;

embedModal.innerHTML = `
<div style="background:#111;width:90%;max-width:500px;padding:15px;border-radius:10px;color:white;position:relative;">
<button id="closeEmbed" style="position:absolute;top:10px;right:10px;background:none;border:none;color:white;font-size:20px;">✕</button>
<h3>Embed Options</h3>
<div id="embedContent"></div>
</div>`;
document.body.appendChild(embedModal);

const downloadModal = document.createElement("div");
downloadModal.style.cssText = embedModal.style.cssText;

downloadModal.innerHTML = `
<div style="background:#111;width:90%;max-width:500px;padding:15px;border-radius:10px;color:white;position:relative;">
<button id="closeDl" style="position:absolute;top:10px;right:10px;background:none;border:none;color:white;font-size:20px;">✕</button>
<h3>Download Options</h3>
<div id="dlContent"></div>
</div>`;
document.body.appendChild(downloadModal);

document.addEventListener("click", (e) => {
  if (e.target.id === "closeEmbed") embedModal.style.display = "none";
  if (e.target.id === "closeDl") downloadModal.style.display = "none";
});

/* ---------------- BUTTONS ---------------- */
function injectButtons(video) {
  actionRow.innerHTML = "";
  actionRow.style.width = "100%";

  /* SHARE */
  const shareBtn = document.createElement("div");
  shareBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"
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
  shareBtn.onclick = async () => {
    const url = `${location.origin}/watch.html?video=${video.id}`;
    if (navigator.share) {
      await navigator.share({ url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };

  /* EMBED */
  const embedBtn = document.createElement("div");
  embedBtn.innerHTML = `<svg width="20" height="20" fill="white" viewBox="0 0 500 500"><path d="M133 116L0 250l133 133h67L67 250l66-134z"/></svg>`;

  embedBtn.onclick = () => {
    const c = document.getElementById("embedContent");
    c.innerHTML = "";

    video.qualities.forEach(q => {
      const box = document.createElement("div");
      box.style.marginBottom = "10px";

      const t = document.createElement("textarea");
      t.style.width = "100%";
      t.style.height = "80px";
      t.value = `<iframe src="${q.embed}" width="100%" height="300"></iframe>`;
      t.readOnly = true;

      const copy = document.createElement("button");
      copy.textContent = "Copy";
      copy.onclick = () => navigator.clipboard.writeText(t.value);

      box.appendChild(t);
      box.appendChild(copy);
      c.appendChild(box);
    });

    embedModal.style.display = "flex";
  };

  /* DOWNLOAD */
  const downloadBtn = document.createElement("div");
  downloadBtn.innerHTML = `<svg width="20" height="20" fill="white" viewBox="0 0 475 475"><path d="M224 323l127-128H73l127 128z"/></svg>`;

  downloadBtn.onclick = () => {
    const c = document.getElementById("dlContent");
    c.innerHTML = "";

    video.qualities.forEach(q => {
      const a = document.createElement("a");
      a.href = q.download;
      a.target = "_blank";
      a.textContent = q.label;
      a.style.display = "block";
      a.style.padding = "10px";
      a.style.background = "#222";
      a.style.marginBottom = "8px";
      a.style.color = "#ff4444";
      c.appendChild(a);
    });

    downloadModal.style.display = "flex";
  };

  /* DONATE */
  const donateBtn = document.createElement("div");
  donateBtn.innerHTML = `<svg width="20" height="20" fill="white" viewBox="0 0 640 640"><path d="M320 48c-13 0-24 10-24 24v12c-37 0-67 30-67 66c0 33 25 62 58 66l61 8c5 0 9 4 9 9c0 6-5 10-11 10h-74c-15 0-27 12-27 27s12 27 27 27h24v12c0 13 10 24 24 24s24-11 24-24v-12c37 0 67-30 67-67c0-33-25-61-58-65l-61-9c-5 0-9-4-9-9c0-6 5-10 11-10h66c15 0 27-12 27-27s-12-27-27-27h-16V72c0-14-10-24-24-24z"/></svg>`;
  donateBtn.onclick = () => window.location.href = "donate.html";

  /* ---------------- LIKE CACHE HELPERS ---------------- */
function getLikeCache(videoId) {
  return Number(localStorage.getItem("likes_" + videoId)) || 0;
}

function setLikeCache(videoId, value) {
  localStorage.setItem("likes_" + videoId, value);
}

function getLikedState(videoId) {
  return localStorage.getItem("liked_" + videoId) === "1";
}

function setLikedState(videoId, state) {
  localStorage.setItem("liked_" + videoId, state ? "1" : "0");
}

/* ---------------- LIKE ---------------- */
const likeWrapper = document.createElement("div");
likeWrapper.style.display = "flex";
likeWrapper.style.alignItems = "center";

const likeBtn = document.createElement("div");
likeBtn.style.width = "46px";
likeBtn.style.height = "28px";
likeBtn.style.border = "1px solid white";
likeBtn.style.borderRadius = "6px";
likeBtn.style.background = "transparent";
likeBtn.style.display = "flex";
likeBtn.style.alignItems = "center";
likeBtn.style.justifyContent = "center";
likeBtn.style.gap = "4px";
likeBtn.style.cursor = "pointer";

/* SVG ICON */
const iconWrapper = document.createElement("div");
iconWrapper.innerHTML = `
<svg width="16" height="16" viewBox="0 0 64 64" stroke="white" stroke-width="3" fill="none">
<path d="M10 30c0-10 10-15 22-5c12-10 22-5 22 5c0 18-22 30-22 30S10 48 10 30z"/>
</svg>
`;

/* COUNT */
const likeCount = document.createElement("span");
likeCount.style.color = "white";
likeCount.style.fontSize = "10px";

/* FIREBASE REF */
const likeRef = ref(db, `likes/${video.id}/${visitId}`);
const countRef = ref(db, `likes/${video.id}`);

/* ---------------- INITIAL CACHE LOAD ---------------- */
likeCount.textContent = getLikeCache(video.id);

/* ---------------- SVG STATE APPLY (CACHE FIRST) ---------------- */
const svg = iconWrapper.querySelector("svg");

if (getLikedState(video.id)) {
  svg.setAttribute("fill", "white");
} else {
  svg.setAttribute("fill", "none");
}

/* ---------------- CLICK TOGGLE ---------------- */
likeBtn.onclick = () => {
  const isLiked = getLikedState(video.id);

  setLikedState(video.id, !isLiked);

  // instant UI update
  svg.setAttribute("fill", !isLiked ? "white" : "none");

  runTransaction(likeRef, cur => cur ? null : true);
};

/* ---------------- LIVE LIKE STATE ---------------- */
onValue(likeRef, snap => {
  const isLiked = snap.exists();

  svg.setAttribute("fill", isLiked ? "white" : "none");
  setLikedState(video.id, isLiked);
});

/* ---------------- LIKE COUNT (WITH CACHE) ---------------- */
onValue(countRef, snap => {
  const data = snap.val() || {};
  const count = Object.keys(data).length;

  likeCount.textContent = count;
  setLikeCache(video.id, count);
});

/* BUILD */
likeBtn.appendChild(iconWrapper);
likeBtn.appendChild(likeCount);
likeWrapper.appendChild(likeBtn);
    
  /* ---------------- LAYOUT SYSTEM ---------------- */

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.alignItems = "center";
  btnRow.style.width = "100%";

  /* LEFT */
  const leftGroup = document.createElement("div");
  leftGroup.style.display = "flex";
  leftGroup.style.gap = "10px";

  leftGroup.appendChild(createStack("Share", shareBtn));
  leftGroup.appendChild(createStack("Embed", embedBtn));
  leftGroup.appendChild(createStack("Download", downloadBtn));
  leftGroup.appendChild(createStack("Donate", donateBtn));

  /* RIGHT */
  const rightGroup = document.createElement("div");
  rightGroup.style.marginLeft = "auto";
  rightGroup.style.display = "flex";

  const likeStack = document.createElement("div");
  likeStack.style.display = "flex";
  likeStack.style.flexDirection = "column";
  likeStack.style.alignItems = "center";
  likeStack.style.gap = "2px";

  const timeText = document.createElement("div");
  timeText.style.fontSize = "10px";
  timeText.style.color = "#aaa";
  timeText.style.marginBottom = "2px";
  timeText.textContent = video.date ? timeAgo(video.date) : "";

  likeStack.appendChild(timeText);
  likeStack.appendChild(likeWrapper);

  rightGroup.appendChild(likeStack);

  btnRow.appendChild(leftGroup);
  btnRow.appendChild(rightGroup);

  actionRow.appendChild(btnRow);
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

      metaDesc.setAttribute(
        "content",
        `Watch ${videoData.title} — streaming now in high quality`
      );

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
      injectButtons(videoData);
    })
    .catch(err => {
      console.error(err);
      titleEl.textContent = "Error loading video";
    });
}

init();
