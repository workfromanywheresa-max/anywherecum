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

  /* SHARE */
  const shareBtn = document.createElement("div");
  shareBtn.innerHTML = `<svg width="20" height="20" fill="white" viewBox="0 0 32 32"><path d="M14 1L2 13l12 12V17c8 0 13 4 16 12-1-10-6-20-16-20V1z"/></svg>`;
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

  /* LIKE */
  const likeWrapper = document.createElement("div");
  likeWrapper.style.display = "flex";
  likeWrapper.style.alignItems = "center";
  likeWrapper.style.gap = "5px";

  const likeBtn = document.createElement("div");
  likeBtn.innerHTML = `
<svg width="20" height="20" fill="none" stroke="white" stroke-width="3" viewBox="0 0 64 64">
<path d="M10 30c0-10 10-15 22-5c12-10 22-5 22 5c0 18-22 30-22 30S10 48 10 30z"/>
</svg>`;

  const likeRef = ref(db, `likes/${video.id}/${visitId}`);

  likeBtn.onclick = () => runTransaction(likeRef, cur => cur ? null : true);

  onValue(likeRef, snap => {
    const icon = likeBtn.querySelector("svg");
    icon.setAttribute("fill", snap.exists() ? "white" : "none");
  });

  likeWrapper.appendChild(likeBtn);

  /* FINAL ROW */
  actionRow.appendChild(createStack("Share", shareBtn));
  actionRow.appendChild(createStack("Embed", embedBtn));
  actionRow.appendChild(createStack("Download", downloadBtn));
  actionRow.appendChild(createStack("Donate", donateBtn));
  actionRow.appendChild(createStack("Like", likeWrapper));
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
