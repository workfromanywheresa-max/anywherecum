const fs = require("fs");

const LAST_FILE = "last_sent.json";

async function run() {
  try {
    const res = await fetch("https://anywherecum.pages.dev/videos.json");
    const videos = await res.json();

    const latest = videos.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )[0];

    if (!latest) {
      console.log("No video found");
      return;
    }

    let lastSent = null;

    if (fs.existsSync(LAST_FILE)) {
      lastSent = JSON.parse(fs.readFileSync(LAST_FILE, "utf8"));
    }

    if (lastSent && lastSent.date === latest.date) {
      console.log("⛔ Already sent this video. Skipping...");
      return;
    }

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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OneSignal error: ${text}`);
    }

    const data = await response.json();
    console.log("Sent:", data);

    fs.writeFileSync(LAST_FILE, JSON.stringify({
      date: latest.date
    }));

  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
}

run();
