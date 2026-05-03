const fs = require("fs");

const baseUrl = "https://anywherecum.pages.dev";

// static pages
const staticPages = [
  "/",
  "/vip.html",
  "/thank-you-vip.html",
  "/thank-you.html",
  "/support.html",
  "/terms-privacy.html",
  "/certificate.html",
  "/competition.html",
  "/contact.html",
  "/crypto-vip.html",
  "/crypto.html",
  "/donate.html",
  "/donation-guidlines.html",
  "/folders.html",
];

// dynamic folders 1–8
const folders = Array.from({ length: 8 }, (_, i) =>
  `/folder.html?folder=${i + 1}`
);

const urls = [...staticPages, ...folders];

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

console.log("Sitemap generated successfully!");
