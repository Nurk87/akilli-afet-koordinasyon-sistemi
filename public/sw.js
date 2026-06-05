const CACHE_NAME = 'afad-aakm-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/css/style.css',
  '/js/i18n.js',
  '/js/iller-ilceler.js',
  '/js/pwa.js',
  '/images/logo.png',
  '/requests/yeni',
  '/requests/olustur',
  '/guvenli-alanlar'
];

// Service Worker Yükleme (Install)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Static dosyalar önbelleğe alınıyor...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Aktifleştirme (Activate)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🧹 Eski önbellek temizleniyor:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch İsteklerini Yakalama (Fetch Event Listener)
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // API rotalarını, atama işlemlerini ve bildirimleri asla önbellekten getirme (Daima canlı ağ)
  if (requestUrl.pathname.includes('/api/') || requestUrl.pathname.includes('/status') || event.request.method !== 'GET') {
    return; // Tarayıcı doğrudan ağa gider
  }

  // HTML, CSS, JS ve Görseller için Cache-First stratejisi (Ağ hatasında önbellek)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Arka planda ağı kontrol edip önbelleği güncelleyelim (Stale-While-Revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {}); // Offline iken hata vermesin
        
        return cachedResponse;
      }

      // Önbellekte yoksa ağdan çek
      return fetch(event.request).then(networkResponse => {
        // Geçerli bir yanıt ise önbelleğe ekle
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Çevrimdışı iken `/requests/yeni` veya ana sayfa isteniyorsa önbelleği ver
        if (event.request.mode === 'navigate') {
          return caches.match('/requests/yeni') || caches.match('/');
        }
      });
    })
  );
});
