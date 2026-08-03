const CACHE_ADI = 'veresiye-takip-cache-v1';
const ONBELLEKLENECEK = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_ADI).then(cache => cache.addAll(ONBELLEKLENECEK)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_ADI).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com')) {
    return;
  }
  event.respondWith(
    fetch(event.request).then(res => {
      const kopya = res.clone();
      caches.open(CACHE_ADI).then(cache => cache.put(event.request, kopya));
      return res;
    }).catch(() => caches.match(event.request))
  );
});
