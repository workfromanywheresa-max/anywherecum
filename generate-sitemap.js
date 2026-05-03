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
  f !== "thank-you.html"
);

// collect static pages
const staticPages = htmlFiles
  .filter(f => f !== "sitemap.xml")
  .map(f => `/${f}`);

// ===============================
// AUTO-DETECT FOLDER NAMES (FIXED)
// ===============================
let folderSet = new Set();

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, "utf8");

  // find folder.html?folder=ANYTHING
  const regex = /folder\.html\?folder=([^"'&\s<>]+)/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const value = match[1];

    try {
      folderSet.add(decodeURIComponent(value));
    } catch (e) {
      folderSet.add(value);
    }
  }
});

// convert detected folders into URLs
const folders = [...folderSet].map(name =>
  `/folder.html?folder=${encodeURIComponent(name)}`
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

console.log("Fully auto sitemap generated (no hardcoding)!");
