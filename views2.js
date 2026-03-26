import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* Firebase */
const app = initializeApp({
  apiKey: "AIzaSyCEX...", // your API key
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);

/* TEST MODE */
const TEST_MODE = localStorage.getItem("testMode") === "true";

/* CONFIG */
const config = window.VIDEO_CONFIG || {};
const folderName = (config.folder || "").toLowerCase();
const dataSource = config.dataSource || "videos.json";

/* Title */
function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
document.getElementById("folderTitle").textContent = folderName ? toTitleCase(folderName) : "🔐VIP Exclusive";

/* Format Views */
function formatViews(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num;
}

/* Worker */
async function sendToWorker(videoId) {
  if (TEST_MODE) return;
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

/* Containers */
const trendingContainer = document.getElementById("trendingVideos");
const normalContainer = document.getElementById("normalVideos");
const videoElements = {};

/* UI update */
function updateUI(id) {
  const v = videoElements[id];
  if (!v) return;

  const total = v.totalViews || 0;
  const cycle = v.cycleViews || 0;
  const isTrending = cycle >= 10;

  const target = isTrending ? trendingContainer : normalContainer;

  if (v.box.parentElement !== target) {
    if (isTrending) target.insertBefore(v.box, target.firstChild);
    else target.appendChild(v.box);
  }

  v.views.textContent = isTrending
    ? `🔥 Trending | 👁 ${formatViews(total)}`
    : `👁 ${formatViews(total)}`;

  v.views.style.color = isTrending ? "#ffcc00" : "#aaa";
}

/* ✅ PopAds Inline Trigger — Once per visit */
let popadsTriggered = false;

function triggerPopAdsOnce() {
  if (popadsTriggered) return;
  popadsTriggered = true;

  (function(){
    var s = window,
        e = "df943b45b977a586b18d9719f0624516",
        u = [
          ["siteId", 384*586 + 133*666 - 925 + 4973799],
          ["minBid", 0],
          ["popundersPerIP", "0"],
          ["delayBetween", 0],
          ["default", false],
          ["defaultPerDay", 0],
          ["topmostLayer", "auto"]
        ],
        scripts = [
          "d3d3LmRpc3BsYXl2ZXJ0aXNpbmcuY29tL3N6SEcvZ3JhL3JhbmNob3IubWluLmpz",
          "ZDNtem9rdHk5NTFjNXcuY2xvdWRmcm9udC5uZXQvZmpxdWVyeS1sYW5nLm1pbi5qcw==",
          "d3d3LmNhaXFianNtbnBra3EuY29tL01lYUZwL1BuSmJhL2xhbmNob3IubWluLmpz",
          "d3d3LmF4Zmd2dnN2Z3dpLmNvbS9panF1ZXJ5LWxhbmcubWluLmpz"
        ],
        z = -1, timeoutId, scriptEl,
        loadNext = function(){
          clearTimeout(timeoutId);
          z++;
          if (scripts[z]) {
            scriptEl = s.document.createElement("script");
            scriptEl.type = "text/javascript";
            scriptEl.async = true;
            scriptEl.src = "https://" + atob(scripts[z]);
            scriptEl.crossOrigin = "anonymous";
            scriptEl.onerror = loadNext;
            scriptEl.onload = function(){ 
              clearTimeout(timeoutId); 
              s[e.slice(0,16)+e.slice(0,16)] || loadNext(); 
            };
            timeoutId = setTimeout(loadNext, 5000);
            s.document.getElementsByTagName("script")[0].parentNode.insertBefore(scriptEl, s.document.getElementsByTagName("script")[0]);
          }
        };
    if(!s[e]){
      try { Object.freeze(s[e] = u); } catch(err){}
      loadNext();
    }
  })();
}

/* 🔹 Global First Click Listener */
document.body.addEventListener("click", () => {
  triggerPopAdsOnce();
}, { once: true });

/* Load Videos */
fetch(dataSource)
.then(res => res.json())
.then(videos => {
  const filtered = folderName
    ? videos.filter(v => v.folder && v.folder.toLowerCase() === folderName)
    : videos;

  filtered.forEach(v => {
    const box = document.createElement("div");
    box.className = "videoBox";

    const wrapper = document.createElement("div");
    wrapper.className = "videoFrameWrapper";

    /* Thumbnail */
    const thumb = document.createElement("img");
    thumb.src = `https://anywherecum.pages.dev/images/${encodeURIComponent(v.thumbnail)}`;
    thumb.style.cursor = "pointer";

    thumb.onclick = () => {
      sendToWorker("clicked_" + v.id);

      const iframe = document.createElement("iframe");
      iframe.src = v.embed;
      iframe.allowFullscreen = true;
      wrapper.innerHTML = "";
      wrapper.appendChild(iframe);
    };

    wrapper.appendChild(thumb);

    /* TITLE */
    const title = document.createElement("h3");
    title.className = "videoTitle";
    title.textContent = v.title;
    title.style.cursor = "pointer";

    title.onclick = () => {
      sendToWorker("clicked_" + v.id);
      window.open(v.url, "_blank");
    };

    /* VIEWS */
    const views = document.createElement("div");
    views.className = "views";
    views.textContent = "👁 0";

    /* DOWNLOAD */
    const btn = document.createElement("a");
    btn.className = "download";
    btn.href = "#";
    btn.textContent = `Download (${v.size || "?"})`;
    btn.style.cursor = "pointer";

    btn.onclick = (e) => {
      e.preventDefault();
      sendToWorker("clicked_" + v.id);
      window.open(v.url, "_blank");
    };

    box.appendChild(wrapper);
    box.appendChild(title);
    box.appendChild(views);
    box.appendChild(btn);

    normalContainer.appendChild(box);

    videoElements[v.id] = {
      box,
      views,
      totalViews: 0,
      cycleViews: 0
    };

    /* Firebase listeners */
    onValue(ref(db, "views/" + v.id), snap => {
      videoElements[v.id].totalViews = snap.val() || 0;
      updateUI(v.id);
    });

    onValue(ref(db, "cycleViews/" + v.id), snap => {
      videoElements[v.id].cycleViews = Number(snap.val()) || 0;
      updateUI(v.id);
    });
  });
});
