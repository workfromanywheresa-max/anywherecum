import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- Firebase ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWH6oNqPpppR4kx0",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ================= SUBSCRIBER WORKER ================= */
const SUBSCRIBER_WORKER =
  "https://anywherecumnotifications.workfromanywhere-sa.workers.dev/subscriber";

window.saveSubscriber = async function (userId, optedIn) {
  try {
    if (!userId) return;

    await fetch(SUBSCRIBER_WORKER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, subscribed: optedIn ? 1 : 0 })
    });
  } catch (err) {
    console.error("Subscriber Worker failed:", err);
  }
};

/* ---------------- PAGE + COUNTRY WORKERS ---------------- */
const WORKER_URL =
  "https://anywherecum.workfromanywhere-sa.workers.dev/increment";

const COUNTRY_WORKER_URL =
  "https://anywherecumcountry.workfromanywhere-sa.workers.dev/";

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

async function sendCountryToWorker() {
  try {
    await fetch(COUNTRY_WORKER_URL, { method: "POST" });
  } catch (err) {
    console.error("Country tracking failed:", err);
  }
}

/* ---------------- PAGE DETECTION ---------------- */
let path = window.location.pathname.toLowerCase();
let pageName =
  path === "/" || path === "/index.html"
    ? "home"
    : path.split("/").filter(Boolean).pop().replace(".html", "");

/* ---------------- PAGE TRACK ---------------- */
function trackPage(page) {
  const key = "page_" + page;
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");
  sendToWorker(page);
}

/* ---------------- FIXED FOLDER CLICK TRACK ---------------- */
function trackPreviewClick(folderName) {
  const key = "preview_" + folderName;
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  // 🔥 IMPORTANT FIX: ensure it counts as pageViews system
  sendToWorker(folderName);
}

window.trackPreviewClick = trackPreviewClick;

/* ---------------- CLICK DETECTION (FIXED) ---------------- */
document.addEventListener("click", function (e) {
  const preview = e.target.closest(".folder-preview");
  if (preview) {
    const folderName = preview.getAttribute("data-folder");
    if (folderName) trackPreviewClick(folderName);
    return;
  }

  // ALSO allow clicking titles inside folder
  const title = e.target.closest(".folder-title, .video-title, .title");
  if (title) {
    const folderName = title.getAttribute("data-folder");
    if (folderName) trackPreviewClick(folderName);
  }
});

/* ---------------- RUN TRACKING ---------------- */
trackPage(pageName);
sendCountryToWorker();

/* ---------------- FORMAT ---------------- */
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(".0", "") + "K";
  return num;
}

/* ---------------- CACHE ---------------- */
function saveCache(key, value) {
  localStorage.setItem(key, value);
}
function getCache(key) {
  return localStorage.getItem(key);
}

/* ---------------- ADMIN UI ---------------- */
let el = null;

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("adminContainer");
  if (!container) return;

  container.innerHTML = `
    <a id="adminLink" href="admin.html" style="
      position: fixed;
      top: 0px;
      left: 0px;
      color: yellow;
      font-weight: bold;
      font-size: 8px;
      text-decoration: none;
      z-index: 9999;
    ">
      <span id="viewNumber">👁 0</span> | Admin
    </a>
  `;

  el = document.getElementById("viewNumber");
});

/* ---------------- FIREBASE VIEWS ---------------- */
const pageRef = ref(db, "pageViews");

let cachedRaw = getCache("totalViews");
let cachedTotal = cachedRaw ? Number(cachedRaw) : null;

let firstLoad = true;
let lastRenderedTotal = null;

onValue(pageRef, (snapshot) => {
  const data = snapshot.val() || {};

  let total = 0;
  Object.values(data).forEach((v) => {
    total += v?.count || 0;
  });

  saveCache("totalViews", total);
  cachedTotal = total;

  if (firstLoad) {
    firstLoad = false;
    lastRenderedTotal = total;
    return;
  }

  if (el && total !== lastRenderedTotal) {
    el.textContent = `👁 ${formatViews(total)}`;
    lastRenderedTotal = total;
  }
});

/* ---------------- INITIAL UI ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (cachedTotal !== null && el) {
    el.textContent = `👁 ${formatViews(cachedTotal)}`;
    lastRenderedTotal = cachedTotal;
  }
});
