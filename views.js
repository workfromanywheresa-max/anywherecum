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

/* ---------------- Prevent Double Init ---------------- */
if (!window.__trackingInitialized) {
  window.__trackingInitialized = true;
}

/* ---------------- Session ID ---------------- */
let sessionId = sessionStorage.getItem("sessionId");

if (!sessionId) {
  sessionId = Date.now() + "_" + Math.random();
  sessionStorage.setItem("sessionId", sessionId);
}

/* ---------------- Track Once ---------------- */
function trackOnce(key, firebasePath) {
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  runTransaction(ref(db, firebasePath), (v) => (v || 0) + 1);
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

/* ---------------- Update Admin Total ---------------- */
async function updateAdminCount() {
  let total = 0;

  // Page views
  const pageSnap = await get(ref(db, "pageViews"));
  if (pageSnap.exists()) {
    const data = pageSnap.val();
    Object.values(data).forEach(v => total += v || 0);
  }

  // Folder views
  const folderSnap = await get(ref(db, "folderViews"));
  if (folderSnap.exists()) {
    const data = folderSnap.val();
    Object.values(data).forEach(v => total += v || 0);
  }

  // Update UI
  const el = document.getElementById("adminViews");
  if (el) {
    el.innerText = `👁${total} Admin`;
  }
}

/* ---------------- Init ---------------- */
updateAdminCount();

/* ---------------- Auto Refresh ---------------- */
setInterval(updateAdminCount, 10000);
