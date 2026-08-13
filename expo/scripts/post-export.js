#!/usr/bin/env node
/**
 * Post-export fixes for the GitHub Pages PWA build.
 *
 * 1. Adds the <link rel="manifest"> tag to the generated index.html
 *    so browsers discover the PWA manifest at the /STEKO subpath.
 * 2. Adds Apple touch-icon and theme-color meta tags for iOS PWA install.
 * 3. Copies the app's assets/images folder into dist/ so the PWA manifest
 *    and service worker can reference icon.png, maskable-icon.png, etc.
 */

const fs = require("node:fs");
const path = require("node:path");

const distDir = path.resolve(__dirname, "../dist");
const publicDir = path.resolve(__dirname, "../public");
const assetsDir = path.resolve(__dirname, "../assets");
const indexPath = path.join(distDir, "index.html");

const BASE_URL = "/STEKO";

if (!fs.existsSync(indexPath)) {
  console.error("[post-export] dist/index.html not found");
  process.exit(1);
}

let html = fs.readFileSync(indexPath, "utf-8");

const manifestLink = `<link rel="manifest" href="${BASE_URL}/manifest.json" />`;
const appleIcon = `<link rel="apple-touch-icon" href="${BASE_URL}/assets/images/icon.png" />`;
const tagsToAdd = [manifestLink, appleIcon].join("\n  ");

if (!html.includes('rel="manifest"')) {
  html = html.replace("</head>", `  ${tagsToAdd}\n</head>`);
  fs.writeFileSync(indexPath, html, "utf-8");
  console.log("[post-export] added manifest and apple-touch-icon links");
} else {
  console.log("[post-export] manifest link already present");
}

const distImagesDir = path.join(distDir, "assets/images");
const sourceImagesDir = path.join(assetsDir, "images");

if (fs.existsSync(sourceImagesDir)) {
  fs.mkdirSync(distImagesDir, { recursive: true });
  for (const file of fs.readdirSync(sourceImagesDir)) {
    const src = path.join(sourceImagesDir, file);
    const dest = path.join(distImagesDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
    }
  }
  console.log("[post-export] copied assets/images to dist/");
} else {
  console.warn("[post-export] assets/images directory not found");
}

// GitHub Pages serves 404.html for unknown routes. Duplicating the app shell
// as 404.html lets deep client-side routes (e.g., /onboarding, /settings) reload
// without a 404 error. Expo Router then handles the path once the JS loads.
const notFoundPath = path.join(distDir, "404.html");
if (!fs.existsSync(notFoundPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
  console.log("[post-export] created 404.html fallback");
} else {
  console.log("[post-export] 404.html already present");
}

// Ensure .nojekyll is present at the root of the deployment so GitHub Pages
// does not ignore underscore-prefixed directories (like _expo/).
const nojekyllPath = path.join(distDir, ".nojekyll");
if (!fs.existsSync(nojekyllPath)) {
  fs.writeFileSync(nojekyllPath, "", "utf-8");
  console.log("[post-export] created .nojekyll");
} else {
  console.log("[post-export] .nojekyll already present");
}

console.log("[post-export] done");
