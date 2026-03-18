// Mater et Fátima — Service Worker
// Cache-first shell, network-first data, offline fallback, background sync, push notifications

const SW_VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE_VERSION = `torneo-${SW_VERSION}`;
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const OFFLINE_URL = "/offline.html";

const APP_SHELL = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

// ──────────────────────────────────────────────
// Install — precache app shell + offline page
// ──────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

// ──────────────────────────────────────────────
// Activate — purge old caches
// ──────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  const currentCaches = [SHELL_CACHE, PAGE_CACHE, DATA_CACHE, IMAGE_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !currentCaches.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ──────────────────────────────────────────────
// Fetch strategies
// ──────────────────────────────────────────────

/** Cache First with network fallback — for app shell assets (CSS, JS, fonts). */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

/** Network First with cache fallback — for navigation and API/data requests. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // For navigation requests, serve the offline page
    if (request.mode === "navigate") {
      return caches.match(OFFLINE_URL);
    }

    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** Cache First, stale-while-revalidate — for images/icons. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

// ──────────────────────────────────────────────
// Fetch event router
// ──────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests in the fetch handler
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Navigation requests → Network First (with offline.html fallback)
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  // API / data requests → Network First with data cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Next.js static assets (JS, CSS chunks) → Cache First
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Other Next.js assets → Stale-while-revalidate
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  // Fonts → Cache First (they rarely change)
  if (
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".ttf")
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Images / icons → Cache First, stale-while-revalidate
  if (
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // App pages → Network First
  if (
    url.pathname === "/" ||
    url.pathname.startsWith("/clasificacion/") ||
    url.pathname.startsWith("/cuadro/") ||
    url.pathname.startsWith("/equipo/") ||
    url.pathname.startsWith("/app/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/seguimiento/")
  ) {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  // Everything else — stale-while-revalidate with shell cache
  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

// ──────────────────────────────────────────────
// Background Sync — offline score submissions
// ──────────────────────────────────────────────

const IDB_NAME = "torneo-offline";
const IDB_VERSION = 1;
const IDB_STORE = "pending-scores";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllPendingScores(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deletePendingScore(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

self.addEventListener("message", (event) => {
  const type = event.data?.type;

  if (type === "skip-waiting") {
    self.skipWaiting();
    return;
  }

  if (type === "sync-offline-scores") {
    event.waitUntil(syncPendingScores({ source: "message" }));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-scores") {
    event.waitUntil(syncPendingScores({ source: "background-sync" }));
  }
});

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  await Promise.all(
    clients.map((client) => {
      client.postMessage(message);
    }),
  );
}

async function syncPendingScores({ source }) {
  let db;

  try {
    db = await openDB();
  } catch {
    // IndexedDB not available — nothing to sync
    await notifyClients({
      type: "offline-sync-update",
      source,
      pendingCount: 0,
      syncedCount: 0,
    });
    return;
  }

  const entries = await getAllPendingScores(db);
  let syncedCount = 0;

  for (const entry of entries) {
    try {
      const response = await fetch("/api/sync-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: entry.matchId,
          matchScope: entry.matchScope,
          homeScore: entry.homeScore,
          awayScore: entry.awayScore,
          actorRole: entry.actorRole,
        }),
      });

      if (response.ok) {
        await deletePendingScore(db, entry.id);
        syncedCount += 1;
      }
      // If the response is not ok (e.g. 4xx/5xx), leave the entry for the next sync attempt
    } catch {
      // Network still down or other error — leave entry for next sync
      break;
    }
  }

  const remainingCount = Math.max(0, entries.length - syncedCount);

  await notifyClients({
    type: "sync-complete",
    source,
    syncedCount,
    pendingCount: remainingCount,
  });
  await notifyClients({
    type: "offline-sync-update",
    source,
    syncedCount,
    pendingCount: remainingCount,
  });
}

// ──────────────────────────────────────────────
// Push Notifications
// ──────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Mater et Fátima",
      body: event.data.text(),
      url: "/",
    };
  }

  const { title, body, url, icon } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "Mater et Fátima", {
      body: body || "",
      icon: icon || "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url || "/" },
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If there's already a window open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }

      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    }),
  );
});
