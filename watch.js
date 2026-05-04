import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue, set, runTransaction } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});

const db = getDatabase(app);

/* ---------------- VISIT ---------------- */
let visitId = localStorage.getItem("visit_id");
if (!visitId) {
  visitId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("visit_id", visitId);
}

/* ---------------- COPY SVG (UNCHANGED) ---------------- */
function copySVG() {
  return `
  <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" width="12" height="12">
    <rect x="3" y="5" width="13" height="13" rx="2"></rect>
    <rect x="9" y="1" width="13" height="13" rx="2"></rect>
  </svg>`;
}

/* ---------------- EMBED MODAL ---------------- */
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

/* ---------------- DOWNLOAD MODAL ---------------- */
const downloadModal = document.createElement("div");
downloadModal.style.cssText = embedModal.style.cssText;

downloadModal.innerHTML = `
<div style="background:#111;width:90%;max-width:500px;padding:15px;border-radius:10px;color:white;position:relative;">
<button id="closeDl" style="position:absolute;top:10px;right:10px;background:none;border:none;color:white;font-size:20px;">✕</button>
<h3>Download Options</h3>
<div id="dlContent"></div>
</div>`;
document.body.appendChild(downloadModal);

/* CLOSE */
document.addEventListener("click", (e) => {
  if (e.target.id === "closeEmbed") embedModal.style.display = "none";
  if (e.target.id === "closeDl") downloadModal.style.display = "none";
});

/* ---------------- BUTTON STACK ---------------- */
function createStack(labelText, button) {
  const stack = document.createElement("div");
  stack.style.display = "flex";
  stack.style.flexDirection = "column";
  stack.style.alignItems = "center";
  stack.style.gap = "2px";

  const label = document.createElement("div");
  label.textContent = labelText;
  label.style.fontSize = "10px";
  label.style.color = "#aaa";

  button.style.width = "46px";
  button.style.height = "28px";
  button.style.border = "1px solid white";
  button.style.borderRadius = "6px";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";

  stack.appendChild(label);
  stack.appendChild(button);

  return stack;
}

/* ---------------- MAIN BUTTONS ---------------- */
function injectButtons(video) {

  const actionRow = document.getElementById("actionRow");
  actionRow.innerHTML = "";

  /* SHARE (UNCHANGED SVG) */
  const shareBtn = document.createElement("div");
  shareBtn.innerHTML = `<svg width="20" height="20" fill="white" viewBox="0 0 32 32"><path d="M14 1L2 13l12 12V17c8 0 13 4 16 12-1-10-6-20-16-20V1z"/></svg>`;
  shareBtn.onclick = () => {
    const url = `https://share.workfromanywhere-sa.workers.dev/?video=${video.id}`;
    navigator.clipboard.writeText(url);
  };

  /* EMBED */
  const embedBtn = document.createElement("div");
  embedBtn.innerHTML = `<svg width="20" height="20" fill="white" viewBox="0 0 500 500"><path d="M133 116L0 250l133 133h67L67 250l66-134z"/></svg>`;

  embedBtn.onclick = () => {

    const container = document.getElementById("embedContent");
    container.innerHTML = "";

    video.qualities.forEach(q => {

      const block = document.createElement("div");
      block.style.marginBottom = "15px";

      const label = document.createElement("div");
      label.textContent = q.label;
      label.style.fontSize = "12px";
      label.style.color = "#aaa";

      const iframeCode = `<iframe src="${q.embed}" width="100%" height="300"></iframe>`;

      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";

      const textarea = document.createElement("textarea");
      textarea.value = iframeCode;
      textarea.readOnly = true;
      textarea.style.width = "100%";
      textarea.style.height = "90px";
      textarea.style.background = "#000";
      textarea.style.color = "#0f0";

      /* ✅ COPY BUTTON WITH YOUR SVG */
      const copyBtn = document.createElement("button");
      copyBtn.innerHTML = copySVG();

      copyBtn.style.position = "absolute";
      copyBtn.style.top = "6px";
      copyBtn.style.right = "6px";
      copyBtn.style.width = "28px";
      copyBtn.style.height = "28px";
      copyBtn.style.background = "rgba(0,0,0,0.6)";
      copyBtn.style.border = "none";
      copyBtn.style.borderRadius = "6px";

      copyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        await navigator.clipboard.writeText(iframeCode);

        copyBtn.style.background = "#00c853";
        setTimeout(() => {
          copyBtn.style.background = "rgba(0,0,0,0.6)";
        }, 800);
      });

      wrapper.appendChild(textarea);
      wrapper.appendChild(copyBtn);

      block.appendChild(label);
      block.appendChild(wrapper);

      container.appendChild(block);
    });

    embedModal.style.display = "flex";
  };

  /* DOWNLOAD (UNCHANGED SVG) */
  const downloadBtn = document.createElement("div");
  downloadBtn.innerHTML = `<svg width="20" height="20" fill="white" viewBox="0 0 475 475"><path d="M224 323l127-128H73l127 128z"/></svg>`;

  downloadBtn.onclick = () => {
    const c = document.getElementById("dlContent");
    c.innerHTML = "";

    video.qualities.forEach(q => {
      const a = document.createElement("a");
      a.href = q.download;
      a.textContent = q.label;
      a.target = "_blank";
      a.style.display = "block";
      a.style.padding = "10px";
      a.style.background = "#222";
      a.style.marginBottom = "8px";
      a.style.color = "#ff4444";
      c.appendChild(a);
    });

    downloadModal.style.display = "flex";
  };

  /* DONATE (UNCHANGED SVG) */
  const donateBtn = document.createElement("div");
  donateBtn.innerHTML = `<svg width="20" height="20" fill="white" viewBox="0 0 640 640"><path d="M320 48c-13 0-24 10-24 24v12c-37 0-67 30-67 66c0 33 25 62 58 66l61 8c5 0 9 4 9 9c0 6-5 10-11 10h-74c-15 0-27 12-27 27s12 27 27 27h24v12c0 13 10 24 24 24s24-11 24-24v-12c37 0 67-30 67-67c0-33-25-61-58-65l-61-9c-5 0-9-4-9-9c0-6 5-10 11-10h66c15 0 27-12 27-27s-12-27-27-27h-16V72c0-14-10-24-24-24z"/></svg>`;
  donateBtn.onclick = () => window.location.href = "donate.html";

  /* LIKE */
  const likeBtn = document.createElement("div");
  likeBtn.innerHTML = `<svg width="20" height="20" fill="none" stroke="white" stroke-width="3" viewBox="0 0 64 64"><path d="M10 30c0-10 10-15 22-5c12-10 22-5 22 5c0 18-22 30-22 30S10 48 10 30z"/></svg>`;

  const likeRef = ref(db, `likes/${video.id}/${visitId}`);

  likeBtn.onclick = () => runTransaction(likeRef, cur => cur ? null : true);

  onValue(likeRef, snap => {
    const icon = likeBtn.querySelector("svg");
    icon.setAttribute("fill", snap.exists() ? "white" : "none");
  });

  /* ADD */
  actionRow.appendChild(createStack("Share", shareBtn));
  actionRow.appendChild(createStack("Embed", embedBtn));
  actionRow.appendChild(createStack("Download", downloadBtn));
  actionRow.appendChild(createStack("Donate", donateBtn));
  actionRow.appendChild(createStack("Like", likeBtn));
}
