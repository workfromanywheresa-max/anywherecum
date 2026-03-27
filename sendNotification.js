const fs = require("fs");
const fetch = require("node-fetch");

const LAST_FILE = "last_sent.json";

async function run() {
  const res = await fetch("https://anywherecum.pages.dev/videos.json");
  const videos = await res.json();

  const latest = videos.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )[0];

  if (!latest) {
    console.log("No video found");
    return;
  }

  // Get last sent video
  let lastSent = null;

  if (fs.existsSync(LAST_FILE)) {
    lastSent = JSON.parse(fs.readFileSync(LAST_FILE, "utf8"));
  }

  // 🔴 Duplicate check
  if (lastSent && lastSent.date === latest.date) {
    console.log("⛔ Already sent this video. Skipping...");
    return;
  }

  // Send notification
  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
    },
    body: JSON.stringify({
      app_id: process.env.ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: "🔥 New Video" },
      contents: { en: latest.title || "Watch now!" },
      big_picture: `https://anywherecum.pages.dev/images/${latest.thumbnail}`,
      url: latest.url
    })
  });

  const data = await response.json();
  console.log("Sent:", data);

  // 💾 Save current video as last sent
  fs.writeFileSync(LAST_FILE, JSON.stringify({
    date: latest.date
  }));
}

run();
