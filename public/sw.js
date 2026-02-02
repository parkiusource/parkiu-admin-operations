// ✅ SERVICE WORKER OPTIMIZADO PARA PARKIU ADMIN
const CACHE_NAME = 'parkiu-admin-v1.0.0';
const STATIC_CACHE_NAME = 'parkiu-static-v1.0.0';
const API_CACHE_NAME = 'parkiu-api-v1.0.0';

// Recursos estáticos críticos para cache
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo-parkiu.svg',
  '/manifest.json'
];

// Patrones de API para cache inteligente
const API_PATTERNS = [
  /\/api\/parking-lots/,
  /\/api\/parking-spaces/,
  /\/api\/admin\/profile/
];

// ✅ INSTALACIÓN: Cache recursos estáticos
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Cacheando recursos estáticos');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('✅ Service Worker: Instalación completada');
        return self.skipWaiting();
      })
  );
});

// ✅ ACTIVACIÓN: Limpiar caches antiguos
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activando...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME &&
                cacheName !== STATIC_CACHE_NAME &&
                cacheName !== API_CACHE_NAME) {
              console.log('🗑️ Service Worker: Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activación completada');
        return self.clients.claim();
      })
  );
});

// ✅ FETCH: Estrategias de cache inteligentes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estrategia para recursos estáticos: Cache First
  if (STATIC_RESOURCES.some(resource => url.pathname === resource)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }

  // Estrategia para APIs: Network First con fallback a cache
  if (API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE_NAME));
    return;
  }

  // Estrategia para assets: Stale While Revalidate
  if (url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  // Default: Network only para otros recursos
  event.respondWith(fetch(request));
});

// ✅ ESTRATEGIA: Cache First (para recursos estáticos)
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('📦 Cache hit:', request.url);
      return cachedResponse;
    }

    console.log('🌐 Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('❌ Cache First error:', error);
    throw error;
  }
}

// ✅ ESTRATEGIA: Network First (para APIs)
async function networkFirst(request, cacheName) {
  try {
    console.log('🌐 Network first:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('💾 API response cached:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.log('📦 Network failed, trying cache:', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('📦 Serving from cache (offline):', request.url);
      return cachedResponse;
    }

    console.error('❌ Network First error:', error);
    throw error;
  }
}

// ✅ ESTRATEGIA: Stale While Revalidate (para assets)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Fetch en background para actualizar cache
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('🔄 Background update:', request.url);
    }
    return networkResponse;
  }).catch((error) => {
    console.warn('⚠️ Background fetch failed:', request.url, error);
  });

  // Devolver cache inmediatamente si existe, sino esperar network
  if (cachedResponse) {
    console.log('⚡ Stale cache served:', request.url);
    return cachedResponse;
  }

  console.log('🌐 No cache, waiting for network:', request.url);
  return fetchPromise;
}

// ✅ MENSAJE: Comunicación con la app principal
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 Service Worker: Skip waiting solicitado');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_STATS') {
    getCacheStats().then((stats) => {
      event.ports[0].postMessage(stats);
    });
  }
});

// ✅ UTILIDAD: Estadísticas de cache
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }

  return stats;
}

console.log('🚀 Service Worker: Registrado y listo para Parkiu Admin');
