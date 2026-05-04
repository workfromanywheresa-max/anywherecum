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
  label.style.whiteSpace = "nowrap";

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

  /* ---------------- SHARE (YOUR ORIGINAL SVG) ---------------- */
  const shareBtn = document.createElement("div");
  shareBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="12" viewBox="0 0 32 32" fill="white">
<g transform="translate(16 16) scale(-1,1) translate(-16 -16)">
<path d="M14.0068 1.0898C14.0062 0.1649 12.9319 -0.2991 12.3015 0.3533L0.9798 12.0682C0.5876 12.474 0.5868 13.134 0.978 13.5408L12.2917 25.3071C12.9217 25.9623 13.9988 25.4982 13.9988 24.5717V17.1611C13.9988 16.5868 13.5511 16.1211 12.9988 16.1211C12.4465 16.1211 11.9988 16.5868 11.9988 17.1611V24.5717L2.3922 12.0701L11.9988 7.8941V13.5427L13.7121 1.8278L12.0068 1.0913V7.8941C12.0068 8.4685 12.4473 8.9338 12.9996 8.9333C13.5518 8.9329 13.9992 8.467 13.9988 7.8926L14.0068 1.0898Z"/>
<path d="M19 8.9832C26 9 29.9701 13 30 18V31.0079L31.9843 30.8234C31.911 30.4152 31.7394 29.7368 31.4375 28.8765C30.9375 27.4523 29 15.9933 20.1003 15.9933H13.1C12.5477 15.9933 12.1 16.441 12.1 16.9933C12.1 17.5456 12.5477 17.9933 13.1 17.9933H19C26.9212 17.9933 29.1066 28.2747 29.5503 29.5389C29.7052 29.9802 29.827 30.3885 29.919 30.7524C29.9726 30.9642 30.0037 31.1094 30.0157 31.1766C30.232 32.3821 32.0097 32.2168 32 30.9921V18C32 10.2746 26 7 19 8.9832Z"/>
</g>
</svg>`;

  /* ---------------- EMBED (YOUR ORIGINAL SVG) ---------------- */
  const embedBtn = document.createElement("div");
  embedBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="12" viewBox="0 0 500 500" fill="white">
<path d="M133.333,116.667L0,250l133.333,133.333H200L66.667,250L200,116.667H133.333z
         M366.667,116.667H300L433.333,250L300,383.333h66.667L500,250L366.667,116.667z"/>
</svg>`;

  /* ---------------- DOWNLOAD (YOUR ORIGINAL SVG) ---------------- */
  const downloadBtn = document.createElement("div");
  downloadBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="12" viewBox="0 0 475.078 475.077" fill="white">
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
</svg>`;

  /* ---------------- DONATE (YOUR ORIGINAL SVG) ---------------- */
  const donateBtn = document.createElement("div");
  donateBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="12" fill="white" viewBox="0 0 640 640">
<path d="M320 48C306.7 48 296 58.7 296 72L296 84L294.2 84C257.6 84 228 113.7 228 150.2C228 183.6 252.9 211.8 286 215.9L347 223.5C352.1 224.1 356 228.5 356 233.7C356 239.4 351.4 243.9 345.8 243.9L272 244C256.5 244 244 256.5 244 272C244 287.5 256.5 300 272 300L296 300L296 312C296 325.3 306.7 336 320 336C333.3 336 344 325.3 344 312L344 300L345.8 300C382.4 300 412 270.3 412 233.8C412 200.4 387.1 172.2 354 168.1L293 160.5C287.9 159.9 284 155.5 284 150.3C284 144.6 288.6 140.1 294.2 140.1L360 140C375.5 140 388 127.5 388 112C388 96.5 375.5 84 360 84L344 84L344 72C344 58.7 333.3 48 320 48z"/>
</svg>`;

  /* ---------------- LIKE (YOUR ORIGINAL SVG) ---------------- */
  const likeWrapper = document.createElement("div");
  likeWrapper.style.display = "flex";

  const likeBtn = document.createElement("div");
  likeBtn.style.width = "46px";
  likeBtn.style.height = "28px";
  likeBtn.style.border = "1px solid white";
  likeBtn.style.borderRadius = "6px";
  likeBtn.style.display = "flex";
  likeBtn.style.alignItems = "center";
  likeBtn.style.justifyContent = "center";

  likeBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 64 64"
width="20"
height="20"
fill="none"
stroke="white"
stroke-width="3">
<g>
<g transform="translate(78, 528)">
<path d="M-22-495.6c0-3.2-2.5-4.9-6-4.9h-10.1c0.7-2.7,1.1-5.3,1.1-7.5
c0-8.7-2.4-10.5-4.5-10.5c-1.4,0-2.4,0.1-3.8,1c-0.4,0.2-0.6,0.6-0.7,1l-1.5,8.1
c-1.6,4.3-5.7,8-9,10.5v21.4c1.1,0,2.5,0.6,3.8,1.3c1.6,0.8,3.3,1.6,5.2,1.6h14.3
c3,0,5.2-2.4,5.2-4.5c0-0.4,0-0.8-0.1-1.1c1.9-0.7,3.1-2.3,3.1-4.1c0-0.9-0.2-1.7-0.5-2.3
c1.1-0.8,2.3-2.1,2.3-3.7c0-0.8-0.4-1.8-1-2.5C-22.9-492.8-22-494.2-22-495.6z"/>
</g>
</g>
</svg>`;

  likeBtn.onclick = () => runTransaction(ref(db, `likes/${video.id}/${visitId}`), c => c ? null : true);

  likeWrapper.appendChild(likeBtn);

  /* FINAL */
  actionRow.appendChild(createStack("Share", shareBtn));
  actionRow.appendChild(createStack("Embed", embedBtn));
  actionRow.appendChild(createStack("Download", downloadBtn));
  actionRow.appendChild(createStack("Donate", donateBtn));
  actionRow.appendChild(createStack("Like", likeWrapper));
}

/* ---------------- INIT ---------------- */
function init() {
  fetch("videos.json")
    .then(r => r.json())
    .then(videos => {
      videoData = videos.find(v => v.id === videoId);

      if (!videoData) return (titleEl.textContent = "Video not found");

      document.title = videoData.title;
      titleEl.textContent = videoData.title;
      watchLabel.textContent = videoData.title;

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
    });
}

init();
