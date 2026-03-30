import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- FIREBASE ---------------- */
const app = initializeApp({
  apiKey: "AIzaSyCEX...",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

/* ---------------- CONFIG ---------------- */
const config = window.VIDEO_CONFIG || {};
const folderName = (config.folder || "").toLowerCase();
const dataSource = config.dataSource || "videos.json";

/* ---------------- CACHE ---------------- */
function getCache(key) { return localStorage.getItem(key); }

/* ---------------- TITLE ---------------- */
function toTitleCase(str) {
  return str.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
document.getElementById("folderTitle").textContent = folderName ? toTitleCase(folderName) : "🔐VIP Exclusive";

/* ---------------- VIEWS FORMAT ---------------- */
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(".0","") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(".0","") + "K";
  return num;
}

/* ---------------- CONTAINERS ---------------- */
const normalContainer = document.getElementById("normalVideos");
const videoElements = {};

/* ---------------- LOAD VIDEOS ---------------- */
fetch(dataSource)
.then(res => res.json())
.then(videos => {

  const filtered = folderName ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName) : videos;

  filtered.forEach(v => {
    const box = document.createElement("div");
    box.className = "videoBox";

    const wrapper = document.createElement("div");
    wrapper.className = "videoFrameWrapper";

    const thumb = document.createElement("img");
    thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(v.thumbnail)}`;
    thumb.onclick = () => {
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
    title.onclick = () => window.open(v.url,"_blank");

    const views = document.createElement("div");
    views.className = "views";
    const cachedViews = getCache("views_" + v.id);
    views.textContent = `👁 ${formatViews(cachedViews ? Number(cachedViews) : 0)}`;

    const btn = document.createElement("a");
    btn.className = "download";
    btn.href = "#";
    btn.textContent = `Download (${v.size || "?"})`;
    btn.onclick = e => { e.preventDefault(); window.open(v.url,"_blank"); };

    box.appendChild(wrapper);
    box.appendChild(title);
    box.appendChild(views);
    box.appendChild(btn);

    normalContainer.appendChild(box);
    videoElements[v.id] = { box, views };

    // Firebase listeners
    onValue(ref(db,"views/" + v.id), snap => {
      videoElements[v.id].views.textContent = `👁 ${formatViews(snap.val() || 0)}`;
    });
  });

  // Remove skeletons after videos loaded
  const skeletons = document.querySelectorAll(".videoBox.skeleton");
  skeletons.forEach(skel => {
    skel.classList.add("removing");
    setTimeout(() => skel.remove(), 600);
  });

});
