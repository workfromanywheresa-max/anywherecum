import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- Firebase ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWH6oNqPpppR4kx0",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ================= UTIL ================= */
function normalizeKey(name) {
  if (!name) return "unknown";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/* ================= SUBSCRIBER WORKER ================= */
const SUBSCRIBER_WORKER = "https://anywherecumnotifications.workfromanywhere-sa.workers.dev/subscriber";

window.saveSubscriber = async function(userId, optedIn) {
  try {
    if (!userId) return;

    await fetch(SUBSCRIBER_WORKER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        subscribed: optedIn ? 1 : 0
      })
    });

  } catch (err) {
    console.error("Subscriber Worker failed:", err);
  }
};

/* ---------------- WORKERS ---------------- */
const WORKER_URL = "https://anywherecum.workfromanywhere-sa.workers.dev/increment";
const COUNTRY_WORKER_URL = "https://anywherecumcountry.workfromanywhere-sa.workers.dev/";

async function sendToWorker(name) {
  try {
    await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: name })
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

/* ================= TRACKING ================= */
function track(name) {
  if (!name) return;

  const clean = normalizeKey(name);

  const key = "track_" + clean;
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");
  sendToWorker(clean);
}

/* ---------------- PAGE DETECTION ---------------- */
let path = window.location.pathname.toLowerCase();

let pageName =
  (path === "/" || path === "/index.html")
    ? "home"
    : path.split("/").filter(Boolean).pop().replace(".html", "");

track(pageName); // ✅ page tracking fixed
sendCountryToWorker();

/* ---------------- GLOBAL CLICK TRACK ---------------- */
window.trackPreviewClick = function(folderName) {
  track(folderName);
};

document.addEventListener("click", function(e) {
  const preview = e.target.closest(".folder-preview");
  if (!preview) return;

  const folderName = preview.getAttribute("data-folder");
  track(folderName);
});

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
    <a href="admin.html" style="
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

/* ---------------- CACHE LOAD ---------------- */
const cachedRaw = getCache("totalViews");
let cachedTotal = cachedRaw ? Number(cachedRaw) : null;
let lastRenderedTotal = null;
let firstLoad = true;

/* ---------------- FIREBASE VIEWS ---------------- */
const pageRef = ref(db, "pageViews");

onValue(pageRef, (snapshot) => {
  const data = snapshot.val() || {};

  let total = 0;
  Object.values(data).forEach(v => {
    total += (v?.count || 0);
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

/* ---------------- INIT UI ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (cachedTotal !== null && el) {
    el.textContent = `👁 ${formatViews(cachedTotal)}`;
    lastRenderedTotal = cachedTotal;
  }
});
