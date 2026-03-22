// views.js
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

// 👉 ONE shared counter for ALL pages
const viewsRef = ref(db, "views/homepage");

// 👉 YOUR IP (won’t count your own views)
const OWNER_IP = "102.214.117.74";

// Format numbers (1.2k, 3.4M)
function formatViews(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num;
}

// Get user IP
async function getUserIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch (e) {
    return null;
  }
}

(async () => {
  const userIP = await getUserIP();

  // ❌ Skip owner
  if (userIP && userIP === OWNER_IP) {
    console.log("Owner detected — view not counted");
  } else {
    // ✅ Count once per session (across all pages)
    if (!sessionStorage.getItem("viewCounted")) {
      runTransaction(viewsRef, (current) => {
        return (current || 0) + 1;
      });
      sessionStorage.setItem("viewCounted", "true");
    }
  }

  // ✅ Show views ONLY if element exists (homepage)
  onValue(viewsRef, (snapshot) => {
    const count = snapshot.val() || 0;
    const el = document.getElementById("viewCount");

    if (el) {
      el.innerText = formatViews(count);
    }
  });

})();
