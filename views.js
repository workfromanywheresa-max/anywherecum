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

/* ---------------- Worker ---------------- */
const WORKER_URL = "https://anywherecum.workfromanywhere-sa.workers.dev/increment";

/* ---------------- Subscriber Worker ---------------- */
const SUB_WORKER_URL = "https://anywherecumnotifications.workfromanywhere-sa.workers.dev/subscriber";

/* ---------------- Send to Worker ---------------- */
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

/* ---------------- Subscriber (SUBSCRIBE / UNSUBSCRIBE) ---------------- */
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
        userId,
        subscribed: subscribed
      })
    });
  } catch (err) {
    console.error("Subscriber worker failed:", err);
  }
}

/* ---------------- Toggle Subscribe ---------------- */
window.saveSubscriber = function (subscribed) {
  localStorage.setItem("subscribed", subscribed);
  sendSubToWorker(subscribed);
};

/* ---------------- Page Detection ---------------- */
let path = window.location.pathname.toLowerCase();

let pageName;

if (path === "/" || path === "/index.html") {
  pageName = "home";
} else {
  pageName = path.split("/").filter(Boolean).pop().replace(".html", "");
}

/* ---------------- Track Page ---------------- */
function trackPage(page) {
  const key = "page_" + page;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");
  sendToWorker(page);
}

/* ---------------- Preview Click Tracking ---------------- */
function trackPreviewClick(folderName) {
  const key = "preview_" + folderName;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");
  sendToWorker(folderName);
}

window.trackPreviewClick = trackPreviewClick;

/* ---------------- Detect Clicks ---------------- */
document.addEventListener("click", function (e) {
  const preview = e.target.closest(".folder-preview");

  if (preview) {
    const folderName = preview.getAttribute("data-folder");

    if (folderName) {
      trackPreviewClick(folderName);
    }
  }
});

/* ---------------- Run Page Tracking ---------------- */
trackPage(pageName);

/* ---------------- Format ---------------- */
function formatViews(num) {
  num = Number(num);
  if (isNaN(num)) return "0";

  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(".0", "") + "K";

  return num;
}

/* ---------------- Cache ---------------- */
function saveCache(key, value) {
  localStorage.setItem(key, value);
}

function getCache(key) {
  return localStorage.getItem(key);
}

/* ---------------- UI ---------------- */
let viewEl = null;

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("adminContainer");

  if (!container) return;

  container.innerHTML = `
    <a id="adminLink" href="admin.html" style="
      position: fixed;
      top: 0px;
      right: 0px;
      color: yellow;
      font-weight: bold;
      font-size: 8px;
      text-decoration: none;
      z-index: 9999;
    ">
      <span id="viewNumber">👁 0</span> | Admin
    </a>
  `;

  viewEl = document.getElementById("viewNumber");
});

/* ---------------- Views Cache ---------------- */
const cachedRaw = getCache("totalViews");

let cachedTotal = (!isNaN(cachedRaw) && cachedRaw !== null)
  ? Number(cachedRaw)
  : null;

/* ---------------- FIRST LOAD ---------------- */
let firstLoad = true;

/* ---------------- Firebase (Views) ---------------- */
const pageRef = ref(db, "pageViews");

onValue(pageRef, (snapshot) => {
  const data = snapshot.val() || {};

  let total = 0;

  Object.values(data).forEach(v => {
    if (typeof v === "number") total += v;
  });

  saveCache("totalViews", total);

  cachedTotal = total;

  if (firstLoad) {
    firstLoad = false;
    return;
  }

  if (viewEl) {
    viewEl.textContent = `👁 ${formatViews(total)}`;
  }
});

/* ---------------- Load Cached Views ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (cachedTotal !== null && viewEl) {
    viewEl.textContent = `👁 ${formatViews(cachedTotal)}`;
  }
});
