const fs = require("fs");
const fetch = require("node-fetch");

const LAST_FILE = "last_sent.json";

async function run() {
  try {
    console.log("🔄 Fetching videos...");

    const res = await fetch("https://anywherecum.pages.dev/videos.json");

    if (!res.ok) {
      throw new Error(`Failed to fetch videos.json: ${res.status}`);
    }

    const videos = await res.json();

    if (!Array.isArray(videos)) {
      throw new Error("videos.json is not an array");
    }

    const latest = videos.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )[0];

    if (!latest) {
      console.log("No video found");
      return;
    }

    console.log("Latest video:", latest.title);

    // Load last sent
    let lastSent = null;

    if (fs.existsSync(LAST_FILE)) {
      lastSent = JSON.parse(fs.readFileSync(LAST_FILE, "utf8"));
    }

    // Prevent duplicates
    if (lastSent && lastSent.date === latest.date) {
      console.log("⛔ Already sent. Skipping...");
      return;
    }

    console.log("📤 Sending notification...");

    const response = await fetch(
      "https://onesignal.com/api/v1/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: process.env.ONESIGNAL_APP_ID,
          included_segments: ["All"],
          headings: { en: "🔥 New Video" },
          contents: { en: latest.title || "Watch now!" },
          big_picture: `https://anywherecum.pages.dev/images/${latest.thumbnail}`,
          url: latest.url,
        }),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`OneSignal error: ${text}`);
    }

    console.log("✅ Notification sent:", text);

    // Save last sent
    fs.writeFileSync(
      LAST_FILE,
      JSON.stringify({ date: latest.date }, null, 2)
    );

    console.log("💾 Saved last sent date");
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run();
