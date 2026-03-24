// views2.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, runTransaction, onValue } 
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

const OWNER_IP = "102.214.117.74";

/* ---------------- Get IP ---------------- */
async function getUserIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch {
    return null;
  }
}

/* ---------------- Increase Views ---------------- */
export async function increaseViews(videoId) {
  const userIP = await getUserIP();
  if (userIP && userIP === OWNER_IP) return;

  runTransaction(ref(db, "views/" + videoId), v => (v || 0) + 1);
  runTransaction(ref(db, "cycleViews/" + videoId), v => (v || 0) + 1);
}

/* ---------------- Worker ---------------- */
export async function sendToWorker(videoId) {
  try {
    await fetch("https://anywherecum.workfromanywhere-sa.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId })
    });
  } catch (err) {
    console.error("Worker send failed:", err);
  }
}

/* ---------------- Bind Video to UI ---------------- */
export function bindVideo(video, elements, containers) {
  const { box, views } = elements;
  const { trendingContainer, normalContainer } = containers;

  // Total views → UI
  onValue(ref(db, "views/" + video.id), snap => {
    const totalViews = snap.val() || 0;

    views.textContent =
      totalViews >= 10
        ? `🔥 Trending | 👁 ${totalViews}`
        : `👁 ${totalViews}`;

    views.style.color = totalViews >= 10 ? "#ffcc00" : "#aaa";
  });

  // Cycle views → trending logic
  onValue(ref(db, "cycleViews/" + video.id), snap => {
    const cycleViews = snap.val() || 0;

    if (cycleViews >= 10) {
      trendingContainer.appendChild(box);
    } else {
      normalContainer.appendChild(box);
    }
  });
}
