const CACHE = 'nova-deals-v1';
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/assets/hero-cyber.jpg', '/assets/placeholders/product-fallback.svg'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => { if (event.request.method !== 'GET') return; event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { const clone=response.clone(); caches.open(CACHE).then((cache)=>cache.put(event.request,clone)); return response; }).catch(()=>caches.match('/index.html')))); });
