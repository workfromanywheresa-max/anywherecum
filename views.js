import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, runTransaction, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCEX5dpi6Tp8KBxCLScWHoNqPpppR4kx0",
  authDomain: "anywherecum-1c8d0.firebaseapp.com",
  databaseURL: "https://anywherecum-1c8d0-default-rtdb.firebaseio.com",
  projectId: "anywherecum-1c8d0",
  storageBucket: "anywherecum-1c8d0.appspot.com",
  messagingSenderId: "686718460803",
  appId: "1:686718460803:web:5d0ec20634dfe2a7d98cb6",
  measurementId: "G-6XXPPV4727"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// 📅 Today
const today = new Date().toISOString().split("T")[0];

// 📄 Detect current page (root pages supported)
const path = window.location.pathname;
let page = path.split("/").pop();
if (!page || page === "") page = "index.html";

// 🔥 Database references
const totalRef = ref(db, "views/total");
const pageTotalRef = ref(db, `views/pages/${page}`);
const dailyRef = ref(db, `views/daily/${today}/${page}`);

// 👇 Increment total views (site-wide)
runTransaction(totalRef, (current) => (current || 0) + 1);

// 👇 Increment per-page total views
runTransaction(pageTotalRef, (current) => (current || 0) + 1);

// 👇 Increment daily views per page
runTransaction(dailyRef, (current) => (current || 0) + 1);

// (Optional) Display views if element exists
onValue(totalRef, (snapshot) => {
  const total = snapshot.val() || 0;
  const el = document.getElementById("totalViews");
  if (el) el.innerText = total;
});

onValue(pageTotalRef, (snapshot) => {
  const count = snapshot.val() || 0;
  const el = document.getElementById("pageViews");
  if (el) el.innerText = count;
});

onValue(dailyRef, (snapshot) => {
  const count = snapshot.val() || 0;
  const el = document.getElementById("dailyViews");
  if (el) el.innerText = count;
});
