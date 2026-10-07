const CACHE_NAME = 'sobuj-ghonta-v2';
const AUDIO_CACHE = 'sobuj-ghonta-audio-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/leaf.svg',
  '/demo-audio/en_0.wav',
  '/demo-audio/en_1.wav',
  '/demo-audio/en_2.wav',
  '/demo-audio/en_3.wav',
  '/demo-audio/bn_0.wav',
  '/demo-audio/bn_1.wav',
  '/demo-audio/bn_2.wav',
  '/demo-audio/bn_3.wav'
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
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Demo audio requests — cache first, network fallback
  if (url.pathname.startsWith('/demo-audio/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(AUDIO_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Audio synthesis endpoint for offline trail walks
  if (url.pathname.includes('/api/tts')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async cache => {
        const response = await fetch(event.request.clone()).catch(() => null);
        if (response && response.ok) {
          return response;
        }
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
