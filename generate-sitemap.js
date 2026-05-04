const fs = require("fs");

const baseUrl = "https://anywherecum.pages.dev";

// ===============================
// CONFIG
// ===============================
const TOTAL_VIDEOS = 20;

// ===============================
// SCAN STATIC HTML FILES
// ===============================
const htmlFiles = fs.readdirSync(".").filter(f =>
  f.endsWith(".html") &&
  f !== "video2.html" &&
  f !== "video.html" &&
  f !== "folder.html" &&
  f !== "admin.html" &&
  f !== "thank-you-vip.html" &&
  f !== "thank-you.html" &&
  f !== "google5e943348fa9c5c7a.html"
);

// ===============================
// STATIC PAGES
// ===============================
const staticPages = htmlFiles.map(f => {
  if (f.toLowerCase() === "index.html") {
    return "/";
  }
  return `/${f}`;
});

// ===============================
// LOAD VIDEOS.JSON
// ===============================
let videos = [];

try {
  videos = JSON.parse(fs.readFileSync("videos.json", "utf8"));
} catch (err) {
  console.log("No videos.json found or invalid JSON");
}

// ===============================
// FOLDERS (NO JSON DEPENDENCY)
// ===============================
let folderSet = new Set();

videos.forEach(video => {
  if (video.folder && video.folder !== "🔒VIP Exclusive") {
    folderSet.add(video.folder.trim());
  }
});

// ===============================
// FOLDER URLS
// ===============================
const folderPages = [...folderSet].map(name =>
  `/folder.html?folder=${encodeURIComponent(name)}`
);

// ===============================
// WATCH URLS (R2 STYLE)
// ===============================
let videoSet = new Set();

for (let i = 1; i <= TOTAL_VIDEOS; i++) {
  videoSet.add(`/watch.html?video=live${i}.mp4`);
}

const watchPages = [...videoSet];

// ===============================
// WATCH2 URLS (FROM videos.json + VIP FILTER)
// ===============================
let watch2Set = new Set();

videos.forEach(video => {
  if (!video.id) return;

  // ❌ SKIP VIP IDS
  if (video.id.toLowerCase().includes("vip")) return;

  watch2Set.add(`/watch2.html?video=${video.id}`);
});

const watch2Pages = [...watch2Set];

// ===============================
// COMBINE ALL URLS
// ===============================
const urls = [...new Set([
  ...staticPages,
  ...folderPages,
  ...watchPages,
  ...watch2Pages
])];

// ===============================
// DATE
// ===============================
const today = new Date().toISOString().split("T")[0];

// ===============================
// GENERATE XML
// ===============================
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${
      url === "/" ? "1.0" :
      url.includes("watch") ? "0.9" : "0.8"
    }</priority>
  </url>`).join("")}
</urlset>`;

// ===============================
// SAVE FILE
// ===============================
fs.writeFileSync("sitemap.xml", sitemap);

console.log("✅ Sitemap generated (WATCH + WATCH2 with VIP excluded)");
