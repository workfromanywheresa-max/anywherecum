import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, runTransaction, get, onValue } 
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

/* ---------------- Workers ---------------- */
const PAGE_WORKER_URL = "https://dashboard.workfromanywhere-sa.workers.dev";
const VIDEO_WORKER_URL = "https://anywherecum.workfromanywhere-sa.workers.dev";

/* ---------------- Session ---------------- */
let sessionId = sessionStorage.getItem("sessionId");

if (!sessionId) {
  sessionId = Date.now() + "_" + Math.random();
  sessionStorage.setItem("sessionId", sessionId);
}

/* ---------------- Utilities ---------------- */
function getFolderFromURL() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("folder") || "").toLowerCase();
}

const folderName = getFolderFromURL();

/* ---------------- Track Folder (once per session) ---------------- */
function trackFolderOnce(folderName) {
  if (!folderName) return;

  const key = "folder_" + folderName + "_" + sessionId;
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  fetch(`${PAGE_WORKER_URL}/increment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: folderName })
  }).catch(() => {});
}

/* ---------------- Track Folder Click ---------------- */
function trackFolderClickOnce(folderName) {
  if (!folderName) return;

  const key = "folder_click_" + folderName + "_" + sessionId;
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  fetch(`${PAGE_WORKER_URL}/increment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: folderName })
  }).catch(() => {});
}

/* ---------------- Get User IP ---------------- */
async function getUserIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch {
    return null;
  }
}

const OWNER_IP = "102.214.117.74";

/* ---------------- Increase Views ---------------- */
async function increaseViews(videoId) {
  const userIP = await getUserIP();
  if (userIP && userIP === OWNER_IP) return;

  runTransaction(ref(db, "views/" + videoId), v => (v || 0) + 1);
  runTransaction(ref(db, "cycleViews/" + videoId), v => (v || 0) + 1);

  fetch(`${VIDEO_WORKER_URL}/increment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId })
  }).catch(() => {});
}

/* ---------------- Expose to HTML ---------------- */
window.trackFolderOnce = trackFolderOnce;
window.trackFolderClickOnce = trackFolderClickOnce;
window.increaseViews = increaseViews;

/* ---------------- Trending Data Helper ---------------- */
window.getVideoStats = function(videoId, callback) {
  const viewRef = ref(db, "views/" + videoId);
  const cycleRef = ref(db, "cycleViews/" + videoId);

  let totalViews = 0;
  let cycleViews = 0;

  onValue(viewRef, snap => {
    totalViews = snap.val() || 0;
    callback({ totalViews, cycleViews });
  });

  onValue(cycleRef, snap => {
    cycleViews = snap.val() || 0;
    callback({ totalViews, cycleViews });
  });
};
