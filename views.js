import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ---------------- Firebase ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWH6oNqPpppR4kx0",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------------- SUBSCRIBER ---------------- */
window.saveSubscriber = function (id, subscribed) {
  const lastState = localStorage.getItem("sub_" + id);

  if (lastState === String(subscribed)) return;

  localStorage.setItem("sub_" + id, subscribed);

  // Save to Firebase
  set(ref(db, "subscribers/" + id), subscribed ? 1 : 0)
    .catch(err => console.error("Firebase error:", err));
};

/* ---------------- ONE SIGNAL ---------------- */
window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function(OneSignal) {

  await OneSignal.init({
    appId: "9f8d0573-08fa-4522-ab09-4a95fa2f442f",
  });

  async function handleSub() {
    const id = OneSignal.User.PushSubscription.id;
    const optedIn = OneSignal.User.PushSubscription.optedIn;

    if (!id) return;

    window.saveSubscriber(id, optedIn);
  }

  handleSub();

  OneSignal.User.PushSubscription.addEventListener("change", handleSub);
});

/* ---------------- PAGE TRACKING ---------------- */
let path = window.location.pathname.toLowerCase();
let pageName = path === "/" ? "home" : path.split("/").pop().replace(".html", "");

function trackPage(page) {
  const key = "page_" + page;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");

  const pageRef = ref(db, "pageViews/" + page);

  onValue(pageRef, (snapshot) => {
    let current = snapshot.val();

    if (typeof current !== "number") current = 0;

    set(pageRef, current + 1);
  }, { onlyOnce: true });
}

trackPage(pageName);

/* ---------------- ADMIN UI ---------------- */
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
      z-index: 9999;
    ">
      <span id="viewNumber">👁 0</span> | Admin
    </a>
  `;

  viewEl = document.getElementById("viewNumber");
});

/* ---------------- FIREBASE TOTAL VIEWS ---------------- */
const pageRef = ref(db, "pageViews");

onValue(pageRef, (snapshot) => {
  const data = snapshot.val() || {};

  let total = 0;

  Object.values(data).forEach(v => {
    if (typeof v === "number") total += v;
  });

  if (viewEl) viewEl.textContent = `👁 ${total}`;
});

/* ---------------- REAL-TIME SUBSCRIBERS ---------------- */
const subsRef = ref(db, "subscribers");

onValue(subsRef, (snapshot) => {
  const data = snapshot.val() || {};

  const subs = Object.entries(data).map(([userId, value]) => ({
    userId,
    subscribed: value === 1
  }));

  console.log("Subscribers:", subs);
});
