import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- Firebase ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWH6oNqPpppR4kx0",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------------- Worker ---------------- */
const WORKER_URL = "https://anywherecum.workfromanywhere-sa.workers.dev/increment";

/* ---------------- Send to Worker ---------------- */
async function sendToWorker(type) {
  try {
    await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
  } catch (err) {
    console.error("Worker tracking failed:", err);
  }
}

/* ---------------- Detect Page ---------------- */
let path = window.location.pathname.toLowerCase();

let pageName;

if (path === "/" || path === "/index.html") {
  pageName = "home";
} else {
  pageName = path.split("/").filter(Boolean).pop().replace(".html", "");
}

/* ---------------- Track Page ---------------- */
function trackPage(page) {
  const key = "page_" + page;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  sendToWorker(page);
}

/* ---------------- Preview Click Tracking ---------------- */
function trackPreviewClick(folderName) {
  const key = "preview_" + folderName;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  sendToWorker(folderName);
}

window.trackPreviewClick = trackPreviewClick;

/* ---------------- Auto-detect preview clicks ---------------- */
document.addEventListener("click", function (e) {

  const preview = e.target.closest(".folder-preview");

  if (preview) {
    const folderName = preview.getAttribute("data-folder");

    if (folderName) {
      trackPreviewClick(folderName);
    }
  }

});

/* ---------------- Run page tracking ---------------- */
trackPage(pageName);

/* ================= FORMAT FUNCTION ================= */
function formatViews(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(".0", "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(".0", "") + "K";
  }
  return num;
}

/* ================= FIREBASE LIVE COUNTER ================= */

const pageRef = ref(db, "pageViews");
const el = document.getElementById("adminViews");

/* ================= UPDATE UI ================= */
function updateUI(total) {
  const formatted = formatViews(total);

  if (el) {
    el.innerText = `👁 ${formatted} | Admin`;
  }

  // store RAW number only
  localStorage.setItem("cachedViews", total);
}

/* ================= SAFE CACHE LOAD ================= */

const rawCache = localStorage.getItem("cachedViews");

let cachedViews = null;

if (rawCache !== null && rawCache !== "null" && !isNaN(rawCache)) {
  cachedViews = Number(rawCache);
}

if (el) {
  if (cachedViews !== null) {
    updateUI(cachedViews);
  } else {
    el.innerText = "👁 Loading...";
  }
}

/* ================= TOTAL FUNCTION ================= */

function getTotal(pageData) {
  let total = 0;

  if (pageData) {
    Object.values(pageData).forEach(v => {
      if (typeof v === "number") total += v;
    });
  }

  return total;
}

/* ================= FIREBASE LISTENER ================= */

onValue(pageRef, (snapshot) => {
  const data = snapshot.val() || {};
  const total = getTotal(data);

  const rawCache = localStorage.getItem("cachedViews");
  const cached = rawCache !== null && !isNaN(rawCache) ? Number(rawCache) : null;

  // only update if changed
  if (cached !== total) {
    updateUI(total);
  }
});
