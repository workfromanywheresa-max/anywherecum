import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- Firebase ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWH6oNqPpppR4kx0",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------------- Workers ---------------- */
const WORKER_URL = "https://anywherecum.workfromanywhere-sa.workers.dev/increment";
const SUB_WORKER_URL = "https://anywherecumnotifications.workfromanywhere-sa.workers.dev/subscriber";

/* ---------------- Worker Calls ---------------- */
async function sendToWorker(type) {
  try {
    await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
  } catch (err) {
    console.error("Worker tracking failed:", err);
  }
}

/* ---------------- Subscriber ---------------- */
async function sendSubToWorker(subscribed) {
  let userId = localStorage.getItem("userId");

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("userId", userId);
  }

  try {
    await fetch(SUB_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: userId,
        subscribed: subscribed,
        timestamp: Date.now()
      })
    });
  } catch (err) {
    console.error("Subscriber worker failed:", err);
  }
}

/* ---------------- Save Subscriber ---------------- */
window.saveSubscriber = function (subscribed) {
  localStorage.setItem("subscribed", subscribed);
  sendSubToWorker(subscribed);
};

/* ---------------- OneSignal ---------------- */
window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function (OneSignal) {

  await OneSignal.init({
    appId: "9f8d0573-08fa-4522-ab09-4a95fa2f442f",
  });

  // Initial check
  const optedIn = OneSignal.User.PushSubscription.optedIn;
  window.saveSubscriber(optedIn);

  // Change detection
  OneSignal.User.PushSubscription.addEventListener("change", () => {
    const optedIn = OneSignal.User.PushSubscription.optedIn;
    window.saveSubscriber(optedIn);
  });

});

/* ---------------- Page Tracking ---------------- */
let path = window.location.pathname.toLowerCase();

let pageName;

if (path === "/" || path === "/index.html") {
  pageName = "home";
} else {
  pageName = path.split("/").filter(Boolean).pop().replace(".html", "");
}

function trackPage(page) {
  const key = "page_" + page;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");
  sendToWorker(page);
}

trackPage(pageName);

/* ---------------- Click Tracking ---------------- */
document.addEventListener("click", function (e) {
  const preview = e.target.closest(".folder-preview");

  if (preview) {
    const folderName = preview.getAttribute("data-folder");

    if (folderName) {
      const key = "preview_" + folderName;

      if (sessionStorage.getItem(key)) return;

      sessionStorage.setItem(key, "1");
      sendToWorker(folderName);
    }
  }
});

/* ---------------- Views UI ---------------- */
let viewEl = null;

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("adminContainer");

  if (!container) return;

  container.innerHTML = `
    <a href="admin.html" style="
      position: fixed;
      top: 0px;
      right: 0px;
      color: yellow;
      font-size: 8px;
      font-weight: bold;
      z-index: 9999;
    ">
      <span id="viewNumber">👁 0</span> | Admin
    </a>
  `;

  viewEl = document.getElementById("viewNumber");
});

/* ---------------- Firebase Views ---------------- */
const pageRef = ref(db, "pageViews");

onValue(pageRef, (snapshot) => {
  const data = snapshot.val() || {};

  let total = 0;

  Object.values(data).forEach(v => {
    if (typeof v === "number") total += v;
  });

  if (viewEl) {
    viewEl.textContent = `👁 ${total}`;
  }
});
