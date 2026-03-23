import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, runTransaction } 
from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

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

const WORKER_URL = "https://admin.workfromanywhere-sa.workers.dev";

let sessionId = sessionStorage.getItem("sessionId");
if (!sessionId) {
  sessionId = Date.now() + "_" + Math.random();
  sessionStorage.setItem("sessionId", sessionId);
}

function countOnce(key, callback) {
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  callback();
}

// Normalize page name
let path = window.location.pathname;

if (path === "/" || path.includes("index")) {
  path = "home";
} else {
  path = path.replace("/", "").replace(".html", "");
}

/* --------------------------
   PAGE TRACKING
--------------------------- */

countOnce("page_" + path, () => {

  runTransaction(ref(db, "pageViews/" + path), v => (v || 0) + 1);

  fetch(`${WORKER_URL}/page`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page: path })
  }).catch(()=>{});

});

/* --------------------------
   HOME TRACKING
--------------------------- */

if (path === "home") {
  countOnce("home_view", () => {

    runTransaction(ref(db, "pageViews/home"), v => (v || 0) + 1);

    fetch(`${WORKER_URL}/home`, {
      method: "POST"
    }).catch(()=>{});

  });
}

/* --------------------------
   FOLDER TRACKING
--------------------------- */

const params = new URLSearchParams(window.location.search);
const folder = params.get("folder");

if (folder) {
  countOnce("folder_" + folder, () => {

    runTransaction(ref(db, "folderViews/" + folder), v => (v || 0) + 1);

    fetch(`${WORKER_URL}/folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder })
    }).catch(()=>{});

  });
            }
