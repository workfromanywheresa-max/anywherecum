import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging.js";

/* ---------------- Firebase ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWH6oNqPpppR4kx0",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com",
  projectId: "anywherecum-1c8d0",
  messagingSenderId: "686718460803",
  appId: "1:686718460803:web:5d0ec20634dfe2a7d98cb6"
};

/* Initialize ONCE */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messaging = getMessaging(app);

/* ---------------- VAPID KEY ---------------- */
const VAPID_KEY = "BPr3HEKutASTzAhQ2mkxwaq_8GtOVfpbITQ7vHk5otzTsPtQthjP4G5fVNoRYSwNQYPeOtFzqbcziuSjZ2EAaZU";

/* ---------------- WORKERS ---------------- */
const TRACK_WORKER = "https://anywherecum.workfromanywhere-sa.workers.dev/increment";
const NOTIF_WORKER = "https://anywherecumnotifications.workfromanywhere-sa.workers.dev/save-token";

/* ================= PUSH NOTIFICATIONS ================= */
async function setupPush() {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") return;

    /* FIX 1: Prevent duplicate token sending */
    if (localStorage.getItem("push_registered")) return;

    /* FIX 2: Register service worker (REQUIRED) */
    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (!token) return;

    console.log("🔥 FCM Token:", token);

    await fetch(NOTIF_WORKER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    localStorage.setItem("push_registered", "1");

  } catch (err) {
    console.error("❌ Push error:", err);
  }
}

/* FIX 3: Prevent multiple executions */
if (!window.pushInitialized) {
  window.onload = () => {
    setupPush();
  };
  window.pushInitialized = true;
}

/* ================= TRACKING ================= */
async function sendToWorker(type) {
  try {
    await fetch(TRACK_WORKER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
  } catch (err) {
    console.error("Worker tracking failed:", err);
  }
}

/* ---------------- Detect Page ---------------- */
let path = window.location.pathname.toLowerCase();

let pageName;

if (path === "/" || path === "/index.html") {
  pageName = "home";
} else {
  /* FIX 4: Prevent crash */
  const parts = path.split("/").filter(Boolean);
  pageName = parts.length
    ? parts[parts.length - 1].replace(".html", "")
    : "home";
}

/* ---------------- Track Page ---------------- */
function trackPage(page) {
  const key = "page_" + page;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  sendToWorker(page);
}

/* ---------------- Preview Click ---------------- */
function trackPreviewClick(folderName) {
  const key = "preview_" + folderName;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  sendToWorker(folderName);
}

window.trackPreviewClick = trackPreviewClick;

/* Click detection */
document.addEventListener("click", function (e) {
  const preview = e.target.closest(".folder-preview");

  if (preview) {
    const folderName = preview.getAttribute("data-folder");

    if (folderName) {
      trackPreviewClick(folderName);
    }
  }
});

/* Run tracking */
trackPage(pageName);

/* ================= FORMAT ================= */
function formatViews(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(".0", "") + "K";
  return num;
}

/* ================= FIREBASE LIVE COUNTER ================= */
const pageRef = ref(db, "pageViews");

onValue(pageRef, (snapshot) => {
  const data = snapshot.val() || {};

  let total = 0;
  Object.values(data).forEach(v => {
    if (typeof v === "number") total += v;
  });

  const el = document.getElementById("adminViews");
  if (el) {
    el.innerText = `👁${formatViews(total)} | Admin`;
  }
});
