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
// FOLDERS (NO JSON DEPENDENCY)
// ===============================
let folderSet = new Set();

// (optional fallback if you still use videos.json for folders)
try {
  const videos = JSON.parse(fs.readFileSync("videos.json", "utf8"));

  videos.forEach(video => {
    if (video.folder && video.folder !== "🔒VIP Exclusive") {
      folderSet.add(video.folder.trim());
    }
  });

} catch (err) {
  console.log("No videos.json found or invalid JSON — skipping folders from JSON");
}

// ===============================
// FOLDER URLS
// ===============================
const folderPages = [...folderSet].map(name =>
  `/folder.html?folder=${encodeURIComponent(name)}`
);

// ===============================
// WATCH URLS (R2 STYLE - FIXED)
// ===============================
let videoSet = new Set();

for (let i = 1; i <= TOTAL_VIDEOS; i++) {
  videoSet.add(`/watch.html?video=live${i}.mp4`);
}

const watchPages = [...videoSet];

// ===============================
// COMBINE ALL URLS
// ===============================
const urls = [...new Set([
  ...staticPages,
  ...folderPages,
  ...watchPages
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
    <priority>${url === "/" ? "1.0" : url.includes("watch") ? "0.9" : "0.8"}</priority>
  </url>`).join("")}
</urlset>`;

// ===============================
// SAVE FILE
// ===============================
fs.writeFileSync("sitemap.xml", sitemap);

console.log("✅ Sitemap generated WITH R2 watch pages (live1–live20)");
