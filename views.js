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
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");
}

/* ================= WORKERS ================= */
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
  sendToWorker(clean);
}

/* ---------------- PAGE TRACKING (FIXED) ---------------- */
let path = window.location.pathname.toLowerCase();

/* clean page name */
let pageName = path.split("/").filter(Boolean).pop() || "home";

/* remove .html */
pageName = pageName.replace(".html", "");

/* special case: root = home */
if (pageName === "" || pageName === "/" || path === "/") {
  pageName = "home";
}

/* FINAL OUTPUT: home, contact, about, etc */
track(pageName);

/* ---------------- COUNTRY TRACKING ---------------- */
sendCountryToWorker();

/* ---------------- GLOBAL FOLDER TRACKING ---------------- */
window.trackPreviewClick = function(folderName) {
  track("folder_" + folderName);
};

/* CLICK TRACKING */
document.addEventListener("click", function(e) {
  const preview = e.target.closest(".folder-preview, [data-folder]");
  if (!preview) return;

  const folderName =
    preview.getAttribute("data-folder") ||
    preview.dataset.folder;

  if (!folderName) return;

  track("folder_" + folderName);
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
