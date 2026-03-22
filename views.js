import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, runTransaction } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
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

// 📄 Detect page
const path = window.location.pathname;
let page = path.split("/").pop();
if (!page || page === "") page = "index.html";

// 🔥 References
const totalRef = ref(db, "views/total");
const pageRef = ref(db, `views/pages/${page}`);
const dailyRef = ref(db, `views/daily/${today}/${page}`);

// 🚀 Prevent double count per session
if (!sessionStorage.getItem("viewed")) {

  runTransaction(totalRef, (val) => (val || 0) + 1);
  runTransaction(pageRef, (val) => (val || 0) + 1);
  runTransaction(dailyRef, (val) => (val || 0) + 1);

  sessionStorage.setItem("viewed", "true");
}
