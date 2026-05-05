import fs from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const cacheName = `building-equipment-quiz-${Date.now()}`;

async function main() {
  const files = await collectFiles(distDir);
  const urls = files
    .map((file) => toDistUrl(file))
    .filter((url) => url !== "./sw.js")
    .sort();

  if (!urls.includes("./")) urls.unshift("./");
  if (!urls.includes("./index.html")) urls.unshift("./index.html");

  const sw = buildServiceWorker(cacheName, Array.from(new Set(urls)));
  await fs.writeFile(path.join(distDir, "sw.js"), sw, "utf8");
  console.log(`Offline service worker generated with ${urls.length} cached files.`);
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function toDistUrl(file) {
  const relative = path.relative(distDir, file).replace(/\\/g, "/");
  return `./${relative}`;
}

function buildServiceWorker(name, urls) {
  return `const CACHE_NAME = ${JSON.stringify(name)};
const PRECACHE_URLS = ${JSON.stringify(urls, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("building-equipment-quiz-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const scopeUrl = new URL(self.registration.scope);
  if (requestUrl.origin !== scopeUrl.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
