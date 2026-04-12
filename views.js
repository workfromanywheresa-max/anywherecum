import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- Firebase ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWH6oNqPpppR4kx0",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ================= WORKERS ================= */
const WORKER_URL = "https://anywherecum.workfromanywhere-sa.workers.dev/increment";
const COUNTRY_WORKER_URL = "https://anywherecumcountry.workfromanywhere-sa.workers.dev/";

/* ================= SESSION CONTROL ================= */
const SESSION_KEY = "session_id";
const LAST_ACTIVE_KEY = "last_active";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function getSessionId() {
  const now = Date.now();
  const lastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY) || 0);

  let sessionId = localStorage.getItem(SESSION_KEY);

  // if no session OR expired → create new session
  if (!sessionId || now - lastActive > SESSION_TIMEOUT) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  localStorage.setItem(LAST_ACTIVE_KEY, now);
  return sessionId;
}

const sessionId = getSessionId();

/* prevent duplicates per session */
function hasTracked(key) {
  return sessionStorage.getItem(key) === "1";
}

function markTracked(key) {
  sessionStorage.setItem(key, "1");
}

/* ================= TRACKING ================= */

async function sendToWorker(folderName) {
  try {
    await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: folderName
      })
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

/* main tracker */
function trackOnce(type, name) {
  if (!name) return;

  const key = `${type}_${name}_${sessionId}`;

  if (hasTracked(key)) return;

  markTracked(key);
  sendToWorker(name);
}

/* ---------------- PAGE TRACKING ---------------- */

let path = window.location.pathname.toLowerCase();
let pageName = path.split("/").filter(Boolean).pop() || "home";
pageName = pageName.replace(".html", "");

trackOnce("page", pageName);

/* ---------------- COUNTRY ---------------- */
sendCountryToWorker();

/* ---------------- GLOBAL FOLDER TRACKING ---------------- */
window.trackPreviewClick = function(folderName) {
  trackOnce("folder", folderName);
};

/* CLICK TRACKING */
document.addEventListener("click", function(e) {
  const preview = e.target.closest(".folder-preview, [data-folder]");
  if (!preview) return;

  const folderName =
    preview.getAttribute("data-folder") ||
    preview.dataset.folder ||
    preview.textContent?.trim();

  if (!folderName) return;

  trackOnce("folder", folderName);
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

/* ---------------- FIREBASE ---------------- */
const pageRef = ref(db, "pageViews");

onValue(pageRef, (snapshot) => {
  const data = snapshot.val() || {};

  let total = 0;
  Object.values(data).forEach(v => {
    total += (typeof v === "number" ? v : v?.count || 0);
  });

  saveCache("totalViews", total);

  if (el) {
    el.textContent = `👁 ${formatViews(total)}`;
  }
});

/* ---------------- INIT ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  const cached = getCache("totalViews");
  if (cached && el) {
    el.textContent = `👁 ${formatViews(Number(cached))}`;
  }
});
