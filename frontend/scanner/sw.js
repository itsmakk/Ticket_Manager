const CACHE = 'csm-scanner-v1'
const PRECACHE = [
  '/scanner/index.html',
  '/scanner/manifest.json',
  '/css/style.css',
  '/js/config.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/qrcode.min.js',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('supabase') || e.request.url.includes('unpkg') || e.request.method === 'POST') return
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => cached))
  )
})
