const fs = require("fs");

const baseUrl = "https://anywherecum.pages.dev";

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
// HANDLE STATIC PAGES
// ===============================
const staticPages = htmlFiles.map(f => {
  if (f.toLowerCase() === "index.html") {
    return "/"; // homepage
  }
  return `/${f}`;
});

// ===============================
// EXTRACT FOLDERS FROM videos.json
// ===============================
let folderSet = new Set();

try {
  const videos = JSON.parse(fs.readFileSync("videos.json", "utf8"));

  videos.forEach(video => {
    if (video.folder) {

      // ❌ EXCLUDE VIP
      if (video.folder === "🔒VIP Exclusive") return;

      folderSet.add(video.folder.trim());
    }
  });

} catch (err) {
  console.error("Error reading videos.json:", err);
}

// ===============================
// ✅ REAL URL FORMAT (NO MISMATCH)
// ===============================
const folderPages = [...folderSet].map(name =>
  `/folder.html?folder=${encodeURIComponent(name)}`
);

// ===============================
// COMBINE + REMOVE DUPLICATES
// ===============================
const urls = [...new Set([
  ...staticPages,
  ...folderPages
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
    <priority>${url === "/" ? "1.0" : "0.8"}</priority>
  </url>`).join("")}
</urlset>`;

// ===============================
// SAVE FILE
// ===============================
fs.writeFileSync("sitemap.xml", sitemap);

console.log("✅ Sitemap generated with REAL URLs (no indexing mismatch)");
