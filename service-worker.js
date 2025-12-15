const CACHE_NAME = 'yelox-pos-dynamic-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
  // Si tienes iconos, el sistema los guardará automáticamente cuando se carguen
];

// 1. INSTALACIÓN: Guardamos lo básico inmediatamente
self.addEventListener('install', (event) => {
  // Obliga al SW a activarse inmediatamente, sin esperar a que cierres la pestaña
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto: guardando archivos estáticos');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. ACTIVACIÓN: Limpieza de cachés viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Reclama el control de los clientes inmediatamente
  return self.clients.claim();
});

// 3. ESTRATEGIA DE CACHÉ DINÁMICO (Stale-While-Revalidate / Cache First con guardado)
self.addEventListener('fetch', (event) => {
  // Solo cacheamos solicitudes GET (imágenes, scripts, estilos)
  if (event.request.method !== 'GET') return;
  // Ignoramos solicitudes que no sean http/https (como chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // A) Si ya lo tenemos en caché, lo devolvemos (velocidad offline)
        if (cachedResponse) {
          return cachedResponse;
        }

        // B) Si no está, lo buscamos en internet
        return fetch(event.request).then((networkResponse) => {
          // Verificamos que la respuesta sea válida
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // C) ¡MAGIA! Guardamos una copia de lo nuevo (JS, CSS, Iconos) para la próxima vez
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        });
      })
  );
});