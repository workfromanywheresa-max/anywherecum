const fs = require("fs");

const baseUrl = "https://anywherecum.pages.dev";

// scan all html files (excluding unwanted system pages)
const htmlFiles = fs.readdirSync(".").filter(f =>
  f.endsWith(".html") &&
  f !== "video2.html" &&
  f !== "video.html" &&
  f !== "folder.html" &&
  f !== "admin.html" &&
  f !== "thank-you-vip.html" &&
  f !== "thank-you.html" &&
  f !== "google5e943348fa9c5c7a.html" &&
  f !== "404.html"
);

// collect static pages
const staticPages = htmlFiles
  .filter(f => f !== "sitemap.xml")
  .map(f => `/${f}`);

// ===============================
// AUTO-DETECT FOLDERS FROM videos.json (EXCLUDING VIP)
// ===============================
let folderSet = new Set();

try {
  const videos = JSON.parse(fs.readFileSync("videos.json", "utf8"));

  videos.forEach(video => {
    if (video.folder) {

      // ❌ EXCLUDE VIP FOLDER
      if (video.folder === "🔒VIP Exclusive") return;

      folderSet.add(video.folder);
    }
  });

} catch (err) {
  console.error("Error reading videos.json:", err);
}

// ===============================
// 🔥 ONLY CHANGE: CLEAN URL FORMAT
// ===============================
const folders = [...folderSet].map(name =>
  `/${encodeURIComponent(name.toLowerCase())}`
);

// final urls
const urls = [...new Set([...staticPages, ...folders])];

const today = new Date().toISOString().split("T")[0];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${url.includes("folder") ? "0.8" : "0.7"}</priority>
  </url>`
  )
  .join("")}
</urlset>`;

fs.writeFileSync("sitemap.xml", sitemap);

console.log("Fully auto sitemap generated from videos.json (VIP excluded)!");
