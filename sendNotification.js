const fetch = require("node-fetch");
const fs = require("fs");

const LAST_FILE = "last_sent.json";

async function run() {
  try {
    console.log("🚀 Script started");

    console.log("🔄 Fetching videos...");

    const res = await fetch("https://anywherecum.pages.dev/videos.json");

    if (!res.ok) {
      throw new Error(`Failed to fetch videos.json: ${res.status}`);
    }

    const videos = await res.json();

    if (!Array.isArray(videos)) {
      throw new Error("videos.json is not an array");
    }

    console.log(`📦 Total videos fetched: ${videos.length}`);

    const latest = videos.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )[0];

    if (!latest) {
      console.log("No video found");
      return;
    }

    console.log("🎬 Latest video:", latest.title);

    // 🚫 Content filter
    if (latest.title?.toLowerCase().includes("butthole")) {
      console.log("🚫 Skipping explicit content");
      return;
    }

    // 📄 Ensure file exists
    if (!fs.existsSync(LAST_FILE)) {
      fs.writeFileSync(LAST_FILE, JSON.stringify({ date: null }, null, 2));
    }

    const lastSent = JSON.parse(fs.readFileSync(LAST_FILE, "utf8"));

    // 🚫 Duplicate prevention
    if (lastSent?.date === latest.date) {
      console.log("⛔ Already sent. Skipping...");
      return;
    }

    console.log("📤 Sending notification...");

    const imageUrl = latest.thumbnail
      ? `https://anywherecum.pages.dev/images/${latest.thumbnail}`
      : null;

    const response = await fetch(
      "https://onesignal.com/api/v1/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.ONESIGNAL_API_KEY.trim()}`,
        },
        body: JSON.stringify({
          app_id: process.env.ONESIGNAL_APP_ID,
          included_segments: ["All"],

          headings: { en: "🎥 Latest Video 🎥" },

          // ✅ Open added next to title
          contents: { en: `${latest.title} - Open` },

          // 🔥 Always open homepage
          url: "https://anywherecum.pages.dev/",

          // 🖼️ Images
          big_picture: imageUrl,
          chrome_web_image: imageUrl,
          large_icon: imageUrl,
        }),
      }
    );

    const text = await response.text();

    console.log("Status:", response.status);
    console.log("OneSignal response:", text);

    if (!response.ok) {
      throw new Error(`OneSignal error: ${text}`);
    }

    console.log("✅ Notification sent!");

    // 💾 Save last sent
    fs.writeFileSync(
      LAST_FILE,
      JSON.stringify({ date: latest.date }, null, 2)
    );

    console.log("💾 Saved last sent date:", latest.date);

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

run();
