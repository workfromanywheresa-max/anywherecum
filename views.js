import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, get } 
from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- Firebase (READ ONLY) ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWH6oNqPpppR4kx0",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------------- Worker ---------------- */
const WORKER_URL = "https://anywherecum.workfromanywhere-sa.workers.dev/increment";

/* ---------------- Session ID ---------------- */
let sessionId = sessionStorage.getItem("sessionId");

if (!sessionId) {
  sessionId = Date.now() + "_" + Math.random();
  sessionStorage.setItem("sessionId", sessionId);
}

/* ---------------- Send to Worker ---------------- */
async function sendToWorker(type) {
  try {
    await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: type,              // 👈 IMPORTANT
        sessionId: sessionId,
        timestamp: Date.now()
      })
    });
  } catch (err) {
    console.error("Worker tracking failed:", err);
  }
}

/* ---------------- Track Page (ONCE) ---------------- */
function trackPage(pageName) {
  const key = "page_" + pageName;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  // ✅ FIX: send page_ prefix
  sendToWorker(key);
}

/* ---------------- Preview Click Tracking ---------------- */
function trackPreviewClick(type) {
  const key = "clicked_" + type;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  sendToWorker(type); // videos/folders stay normal
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
trackPage(pageName);

/* ---------------- Admin Counter (FILTERED) ---------------- */
async function updateAdminCount() {
  let total = 0;

  const snap = await get(ref(db, "views"));

  if (snap.exists()) {
    const data = snap.val();

    Object.entries(data).forEach(([key, v]) => {
      // ✅ ONLY count pages
      if (key === "page_home" || key.startsWith("page_")) {
        total += v || 0;
      }
    });
  }

  const el = document.getElementById("adminViews");
  if (el) {
    el.innerText = `👁${total} | Admin`;
  }
}

/* ---------------- Init ---------------- */
updateAdminCount();
setInterval(updateAdminCount, 10000);

/* ---------------- GLOBAL ---------------- */
window.trackPreviewClick = trackPreviewClick;
