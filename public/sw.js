// Mater et Fatima - Service Worker
// Runtime rules:
// - documents: network-first with offline fallback on safe routes
// - versioned Next assets: cache-first
// - images/icons: stale-while-revalidate with explicit fallback
// - APIs and private routes: network-only
// - RSC/prefetch/tokenized flows: bypass cache entirely

const SW_VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE_VERSION = `torneo-${SW_VERSION}`;
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const OFFLINE_URL = "/offline.html";
const EMPTY_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

const SW_MESSAGES = {
  SKIP_WAITING: "skip-waiting",
  UPDATE_READY: "update-ready",
  OFFLINE_SYNC_UPDATE: "offline-sync-update",
  SYNC_COMPLETE: "sync-complete",
};

const APP_SHELL = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const currentCaches = [SHELL_CACHE, PAGE_CACHE, IMAGE_CACHE];

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
      .then(async () => {
        await self.clients.claim();
        await notifyClients({ type: SW_MESSAGES.UPDATE_READY, version: SW_VERSION });
      }),
  );
});

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

    if (request.mode === "navigate" || request.destination === "document") {
      return caches.match(OFFLINE_URL);
    }

    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

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
    .catch(() => null);

  const response = cached || (await networkFetch);

  if (response) {
    return response;
  }

  if (request.destination === "image") {
    return fetch(EMPTY_PIXEL);
  }

  return new Response("", { status: 204 });
}

async function networkOnly(request) {
  return fetch(request);
}

function isRscOrPrefetchRequest(request, url) {
  return (
    url.searchParams.has("_rsc") ||
    request.headers.has("rsc") ||
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-middleware-prefetch") === "1"
  );
}

function isSensitiveRequest(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/api/push/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/confirmacion/") ||
    url.pathname.startsWith("/inscripcion/exito") ||
    url.pathname.startsWith("/q/") ||
    url.pathname.startsWith("/seguimiento/")
  );
}

function isSafeOfflineDocument(url) {
  return (
    url.pathname === "/" ||
    url.pathname === "/login" ||
    url.pathname === "/inscripcion" ||
    (url.pathname.startsWith("/inscripcion/") &&
      !url.pathname.startsWith("/inscripcion/exito")) ||
    url.pathname.startsWith("/clasificacion/") ||
    url.pathname.startsWith("/cuadro/") ||
    url.pathname.startsWith("/equipo/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (isRscOrPrefetchRequest(request, url) || isSensitiveRequest(url)) {
    event.respondWith(networkOnly(request));
    return;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    if (!isSafeOfflineDocument(url)) {
      event.respondWith(networkOnly(request));
      return;
    }

    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkOnly(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  if (
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".ttf")
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

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

  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

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

  if (type === SW_MESSAGES.SKIP_WAITING) {
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
    await notifyClients({
      type: SW_MESSAGES.OFFLINE_SYNC_UPDATE,
      source,
      pendingCount: 0,
      syncedCount: 0,
      status: "idle",
    });
    return;
  }

  const entries = await getAllPendingScores(db);
  let syncedCount = 0;

  await notifyClients({
    type: SW_MESSAGES.OFFLINE_SYNC_UPDATE,
    source,
    pendingCount: entries.length,
    syncedCount: 0,
    status: entries.length > 0 ? "syncing" : "idle",
  });

  for (const entry of entries) {
    try {
      const response = await fetch("/api/sync-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-torneo-intent": "same-origin-json",
        },
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
    } catch {
      break;
    }
  }

  const remainingCount = Math.max(0, entries.length - syncedCount);
  const status =
    syncedCount > 0 ? "synced" : remainingCount > 0 ? "pending" : "idle";

  await notifyClients({
    type: SW_MESSAGES.SYNC_COMPLETE,
    source,
    syncedCount,
    pendingCount: remainingCount,
    status,
  });
  await notifyClients({
    type: SW_MESSAGES.OFFLINE_SYNC_UPDATE,
    source,
    syncedCount,
    pendingCount: remainingCount,
    status,
  });
}

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Mater et Fatima",
      body: event.data.text(),
      url: "/",
    };
  }

  const { title, body, url, icon } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "Mater et Fatima", {
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

  const targetUrl = normalizeNotificationTarget(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus().then(() => client.navigate(targetUrl));
        }
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});

function normalizeNotificationTarget(rawUrl) {
  try {
    const normalized = new URL(rawUrl || "/", self.location.origin);

    if (normalized.origin !== self.location.origin) {
      return "/";
    }

    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  } catch {
    return "/";
  }
}
