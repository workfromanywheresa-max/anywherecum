import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, runTransaction } 
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
if (window.__trackingInitialized) {
  // stop duplicate execution
} else {
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

/* Normalize page name */
let pageName;

if (path === "/" || path === "/index.html") {
  pageName = "home";
} else if (path.includes("folder")) {
  // Folder page → use query param
  const params = new URLSearchParams(window.location.search);
  const folder = params.get("folder");

  if (folder) {
    pageName = "folder_" + folder;
  } else {
    pageName = "folder_unknown";
  }
} else {
  pageName = path.split("/").filter(Boolean).pop().replace(".html", "");
}

/* ---------------- Track Page View ---------------- */
trackOnce("page_" + pageName, "pageViews/" + pageName);
