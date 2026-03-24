import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, runTransaction, get } 
from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- Firebase Config ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWH6oNqPpppR4kx0",
  authDomain: "anywherecum-1c8d0.firebaseapp.com",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com",
  projectId: "anywherecum-1c8d0",
  storageBucket: "anywherecum-1c8d0.firebasestorage.app",
  messagingSenderId: "686718460803",
  appId: "1:686718460803:web:78827198d1be2904d98cb6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------------- Worker Config ---------------- */
const WORKER_URL = "https://anywherecum.workfromanywhere-sa.workers.dev/";

/* ---------------- Session ID ---------------- */
let sessionId = sessionStorage.getItem("sessionId");

if (!sessionId) {
  sessionId = Date.now() + "_" + Math.random();
  sessionStorage.setItem("sessionId", sessionId);
}

/* ---------------- Send to Worker ---------------- */
async function sendToWorker(pageName) {
  try {
    await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        page: pageName,
        sessionId: sessionId,
        timestamp: Date.now()
      })
    });
  } catch (err) {
    console.error("Worker tracking failed:", err);
  }
}

/* ---------------- Track Once (Page Views) ---------------- */
function trackOnce(key, firebasePath) {
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");
  runTransaction(ref(db, firebasePath), (v) => (v || 0) + 1);
}

/* ---------------- Preview Click Tracking ---------------- */
function trackPreviewClick(type) {
  const key = "clicked_" + type;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  runTransaction(ref(db, "pageViews/" + type), (v) => (v || 0) + 1);

  sendToWorker(type);
}

/* ---------------- Detect Page ---------------- */
let path = window.location.pathname.toLowerCase();

let pageName;

if (path === "/" || path === "/index.html") {
  pageName = "home";
} else {
  pageName = path.split("/").filter(Boolean).pop().replace(".html", "");
}

/* ---------------- Track Page View ---------------- */
trackOnce("page_" + pageName, "pageViews/" + pageName);

/* ---------------- Worker Page Tracking ---------------- */
if (!sessionStorage.getItem("worker_" + pageName)) {
  sessionStorage.setItem("worker_" + pageName, "1");
  sendToWorker(pageName);
}

/* ---------------- Update Admin Total ---------------- */
async function updateAdminCount() {
  let total = 0;

  const pageSnap = await get(ref(db, "pageViews"));
  if (pageSnap.exists()) {
    const data = pageSnap.val();
    Object.values(data).forEach(v => total += v || 0);
  }

  const el = document.getElementById("adminViews");
  if (el) {
    el.innerText = `👁${total} | Admin`;
  }
}

/* ---------------- Init ---------------- */
updateAdminCount();
setInterval(updateAdminCount, 10000);

/* =========================================================
   GLOBAL HELPER (used by HTML click tracking)
========================================================= */
window.trackPreviewClick = trackPreviewClick;

/* =========================================================
   CLICK TRACKING (ALL FOLDERS + LATEST + VIP)
========================================================= */

document.addEventListener("click", function (e) {

  function getFolderNameFromElement(el) {
    return (
      el?.dataset?.folder ||
      el?.closest("[data-folder]")?.dataset.folder ||
      el?.getAttribute("data-folder") ||
      null
    );
  }

  /* ---------------- Latest Video ---------------- */
  const latestClick = e.target.closest("#latestVideo a.folder-link, #latestVideo img");

  if (latestClick) {
    e.preventDefault();

    const li = latestClick.closest("li");
    let folderName = li?.dataset?.folder;

    if (!folderName) {
      folderName = "home";

      if (window.trackPreviewClick) {
        window.trackPreviewClick(folderName);
      }

      window.location.href = "folder.html?folder=" + encodeURIComponent(folderName);
      return;
    }

    if (window.trackPreviewClick) {
      window.trackPreviewClick(folderName);
    }

    window.location.href = "folder.html?folder=" + encodeURIComponent(folderName);
    return;
  }

  /* ---------------- Folder Links ---------------- */
  const folderLink = e.target.closest("a.folder-link");
  if (folderLink) {
    e.preventDefault();

    const folderName = getFolderNameFromElement(folderLink);

    if (window.trackPreviewClick && folderName) {
      window.trackPreviewClick(folderName);
    }

    setTimeout(() => {
      window.location.href = folderLink.href;
    }, 150);

    return;
  }

  /* ---------------- Folder Images ---------------- */
  const folderImage = e.target.closest("#folderList img, #vipList img");
  if (folderImage) {

    const folderName = getFolderNameFromElement(folderImage);

    if (window.trackPreviewClick && folderName) {
      window.trackPreviewClick(folderName);
    }

    return;
  }

  /* ---------------- VIP Links ---------------- */
  const vipLink = e.target.closest("#vipList a.folder-link");
  if (vipLink) {
    e.preventDefault();

    const folderName = getFolderNameFromElement(vipLink);

    if (window.trackPreviewClick && folderName) {
      window.trackPreviewClick(folderName);
    }

    setTimeout(() => {
      window.location.href = vipLink.href;
    }, 150);

    return;
  }

});
