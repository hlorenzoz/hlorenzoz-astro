// public/sw.js - Service Worker for PWA
const _CACHE_NAME = 'ai-agency-v1';
const STATIC_CACHE = 'ai-agency-static-v1';
const DYNAMIC_CACHE = 'ai-agency-dynamic-v1';

// Files to cache immediately
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icons/icon.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external APIs, analytics, Zaraz (/cdn-cgi), and Next.js /api/ routes
    const url = new URL(request.url);
    if (!url.origin.includes(self.location.hostname) || url.pathname.startsWith('/api/') || url.pathname.startsWith('/cdn-cgi/')) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Clone the response
                const responseClone = response.clone();

                // Cache successful responses
                if (response.status === 200) {
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }

                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // Return offline HTML page ONLY if the request is for a visual document (navigation)
                    if (request.mode === 'navigate' || request.destination === 'document') {
                        return caches.match('/');
                    }

                    // For third-party scripts, images, or APIs that fail to load (e.g., ad blockers, offline),
                    // return a proper blank network error response instead of falsely serving the HTML homepage.
                    return new Response('', { status: 408, statusText: 'Offline or Blocked' });
                });
            })
    );
});

// Background sync
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    if (event.tag === 'sync-forms') {
        event.waitUntil(syncForms());
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {};
    const title = data.title || 'AI Agency';
    const options = {
        body: data.body || 'New notification',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: data.url,
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.notification.data) {
        event.waitUntil(
            self.clients.openWindow(event.notification.data)
        );
    }
});

// Helper function for form sync
async function syncForms() {
    // Implement form sync logic here
    console.log('[SW] Syncing forms...');
}
