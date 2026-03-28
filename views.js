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

/* ================= FIREBASE ================= */

const pageRef = ref(db, "pageViews");
const el = document.getElementById("adminViews");

/* ================= CACHE ================= */

function saveCache(key, value) {
  localStorage.setItem(key, value);
}

function getCache(key) {
  return localStorage.getItem(key);
}

/* ================= LOAD CACHE ================= */

const cachedTotalRaw = getCache("totalViews");

let cachedTotal = (!isNaN(cachedTotalRaw) && cachedTotalRaw !== null)
  ? Number(cachedTotalRaw)
  : null;

/* ================= UPDATE UI ================= */

function updateUI(total) {
  const formatted = formatViews(total);

  if (el) {
    el.innerText = `👁 ${formatted} | Admin`;
  }
}

/* ================= INITIAL LOAD ================= */

if (el && cachedTotal !== null) {
  updateUI(cachedTotal);
}

/* ================= SUM FUNCTION ================= */

function getTotal(pageData) {
  let total = 0;

  if (pageData) {
    Object.values(pageData).forEach(v => {
      if (typeof v === "number") total += v;
    });
  }

  return total;
}

/* ================= LISTENER ================= */

onValue(pageRef, (snapshot) => {
  const data = snapshot.val() || {};
  const total = getTotal(data);

  // ONLY update if changed (removes flicker)
  if (cachedTotal !== total) {
    updateUI(total);

    saveCache("totalViews", total);
    saveCache("pageViewsData", JSON.stringify(data));

    cachedTotal = total;
  }
});
