import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, get } 
from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- Firebase ---------------- */
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        sessionId,
        timestamp: Date.now()
      })
    });
  } catch (err) {
    console.error("Worker tracking failed:", err);
  }
}

/* ---------------- Track Page ---------------- */
function trackPage(pageName) {
  const key = pageName;

  if (sessionStorage.getItem("page_" + key)) return;

  sessionStorage.setItem("page_" + key, "1");

  sendToWorker(key);
}

/* ---------------- Track Video Clicks (FIXED) ---------------- */
function trackPreviewClick(type) {
  const key = "clicked_" + type; // ✅ FIX

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  sendToWorker(key); // ✅ send clicked_ prefixed key
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

/* ---------------- Admin Counter ---------------- */
async function updateAdminCount() {
  let total = 0;

  const snap = await get(ref(db, "pageViews"));

  if (snap.exists()) {
    const data = snap.val();

    Object.values(data).forEach(v => {
      total += v || 0;
    });
  }

  const el = document.getElementById("adminViews");
  if (el) {
    el.innerText = `👁${total} | Admin`;
  }
}

updateAdminCount();
setInterval(updateAdminCount, 10000);

/* ---------------- GLOBAL ---------------- */
window.trackPreviewClick = trackPreviewClick;

/* ---------------- WORKER ---------------- */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const FIREBASE_DB = "https://anywherecum-1c8d0-default-rtdb.firebaseio.com";

    const ip = request.headers.get("CF-Connecting-IP");
    const YOUR_IP = "102.214.117.74";

    if (ip === YOUR_IP) {
      return new Response("Blocked", {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (url.pathname === "/increment" && request.method === "POST") {
      try {
        const body = await request.json();
        const key = body.videoId || body.type;

        if (!key) {
          return new Response("Missing key", { status: 400 });
        }

        /* =========================
           PAGE VIEWS
        ========================= */
        if (!key.startsWith("clicked_")) {

          const res = await fetch(`${FIREBASE_DB}/pageViews/${key}.json`);
          const data = await res.json();
          const current = typeof data === "number" ? data : 0;

          await fetch(`${FIREBASE_DB}/pageViews/${key}.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(current + 1)
          });

        } else {

          /* =========================
             VIDEO VIEWS
          ========================= */
          const cleanKey = key.replace("clicked_", "");

          const res = await fetch(`${FIREBASE_DB}/views/${cleanKey}.json`);
          const data = await res.json();
          const current = typeof data === "number" ? data : 0;

          await fetch(`${FIREBASE_DB}/views/${cleanKey}.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(current + 1)
          });

          /* cycleViews */
          const cycleRes = await fetch(`${FIREBASE_DB}/cycleViews/${cleanKey}.json`);
          const cycleData = await cycleRes.json();
          const currentCycle = typeof cycleData === "number" ? cycleData : 0;

          await fetch(`${FIREBASE_DB}/cycleViews/${cleanKey}.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentCycle + 1)
          });
        }

        return new Response(JSON.stringify({ success: true, key }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });

      } catch (err) {
        console.log("Worker error:", err);

        return new Response("Worker Error", {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    return new Response("Worker running", {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  },

  async scheduled() {
    const FIREBASE_DB = "https://anywherecum-1c8d0-default-rtdb.firebaseio.com";

    try {
      const res = await fetch(`${FIREBASE_DB}/cycleViews.json`);
      const data = await res.json();

      if (!data) return;

      const updates = Object.keys(data).map(async (key) => {
        await fetch(`${FIREBASE_DB}/cycleViews/${key}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(0)
        });
      });

      await Promise.all(updates);

      console.log("cycleViews reset");
    } catch (err) {
      console.log("Cron error:", err);
    }
  }
};
