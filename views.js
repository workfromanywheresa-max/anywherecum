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
const SUB_WORKER_URL = "https://anywherecumnotifications.workfromanywhere-sa.workers.dev/subscriber";

/* ---------------- Send Views ---------------- */
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

/* ---------------- SUBSCRIBER ---------------- */
window.saveSubscriber = function (id, subscribed) {

  if (typeof subscribed !== "boolean") return;

  const lastState = localStorage.getItem("sub_" + id);

  if (lastState === String(subscribed)) return;

  localStorage.setItem("sub_" + id, subscribed);

  fetch(SUB_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: id, subscribed })
  }).catch(err => console.error(err));
};

/* ---------------- ONE SIGNAL ---------------- */
window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function(OneSignal) {

  await OneSignal.init({
    appId: "9f8d0573-08fa-4522-ab09-4a95fa2f442f",
  });

  function handleSub() {
    const id = OneSignal.User.PushSubscription.id;
    const optedIn = OneSignal.User.PushSubscription.optedIn;

    if (!id) return;

    window.saveSubscriber(id, !!optedIn);
  }

  handleSub();

  OneSignal.User.PushSubscription.addEventListener("change", handleSub);
});

/* ---------------- PAGE TRACK ---------------- */
let path = window.location.pathname.toLowerCase();
let pageName = path === "/" ? "home" : path.split("/").pop().replace(".html", "");

function trackPage(page) {
  const key = "page_" + page;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");
  sendToWorker(page);
}

trackPage(pageName);

/* ---------------- FIREBASE VIEWS ---------------- */
const pageRef = ref(db, "pageViews");

onValue(pageRef, (snapshot) => {
  const data = snapshot.val() || {};

  let total = 0;

  Object.values(data).forEach(v => {
    if (typeof v === "number") total += v;
  });

  const el = document.getElementById("viewNumber");
  if (el) el.textContent = `👁 ${total}`;
});
