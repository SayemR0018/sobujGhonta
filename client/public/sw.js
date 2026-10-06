const CACHE_NAME = 'sobuj-ghonta-v1';
const AUDIO_CACHE = 'sobuj-ghonta-audio-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/leaf.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== AUDIO_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Audio caching for offline trail walks
  if (url.pathname.includes('/api/tts')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async cache => {
        // For POST /api/tts requests, Cache API doesn't support POST keys directly,
        // so offline pre-downloads store synthetic GET-keyed request entries or use IndexedDB.
        const response = await fetch(event.request.clone()).catch(() => null);
        if (response && response.ok) {
          return response;
        }
        // If network failed, attempt match
        const cached = await cache.match(event.request.url);
        if (cached) return cached;
        throw new Error('Offline and audio not cached');
      })
    );
    return;
  }

  // App Shell Navigation & Assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
