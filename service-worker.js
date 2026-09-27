// Color Origin — service worker
// Cache-first for the app shell so the installed app opens instantly and works offline.
// Everything else (e.g. the Google Fonts request) passes straight through to the network.

var CACHE_NAME = 'color-origin-v3';
var SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './assets/logo.png',
  './lib/html2canvas.min.js'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var url = new URL(event.request.url);

  // Only handle same-origin GET requests for the app shell; let everything
  // else (fonts, any future API calls) go straight to the network untouched.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      if (cached) return cached;
      return fetch(event.request).then(function(response){
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){
        // offline and not cached: fall back to the shell page for navigations
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
