import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, runTransaction } 
from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* --------------------------
   FIREBASE CONFIG
--------------------------- */
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

/* --------------------------
   WORKER URL (optional)
--------------------------- */
const WORKER_URL = "https://admin.workfromanywhere-sa.workers.dev";

/* --------------------------
   SESSION ID
--------------------------- */
let sessionId = sessionStorage.getItem("sessionId");

if (!sessionId) {
  sessionId = Date.now() + "_" + Math.random();
  sessionStorage.setItem("sessionId", sessionId);
}

/* --------------------------
   GET PAGE NAME
--------------------------- */
let path = window.location.pathname;

if (path === "/" || path.includes("index")) {
  path = "home";
} else {
  path = path.replace("/", "").replace(".html", "");
}

/* --------------------------
   TRACK FUNCTION
--------------------------- */
function trackOnce(key, firebasePath, workerPath, body = null) {
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  // Firebase increment
  runTransaction(ref(db, firebasePath), (v) => (v || 0) + 1);

  // Worker call (optional)
  fetch(`${WORKER_URL}/${workerPath}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  }).catch(() => {});
}

/* --------------------------
   HOME TRACKING
--------------------------- */
if (path === "home") {
  trackOnce("home_view", "pageViews/home", "home");
}

/* --------------------------
   PAGE TRACKING
--------------------------- */
trackOnce(
  "page_" + path,
  "pageViews/" + path,
  "page",
  { page: path }
);

/* --------------------------
   FOLDER TRACKING
--------------------------- */
const params = new URLSearchParams(window.location.search);
const folder = params.get("folder");

if (folder) {
  trackOnce(
    "folder_" + folder,
    "folderViews/" + folder,
    "folder",
    { folder }
  );
}
