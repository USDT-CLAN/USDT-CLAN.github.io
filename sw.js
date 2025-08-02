// sw.js - Service Worker para Lunaria Mining Premium

const CACHE_NAME = 'lunaria-cache-v1.4.0'; // Se actualiza la versión del caché
const urlsToCache = [
  '/',
  'index.html',
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://i.postimg.cc/GpPsSmmX/4491470.png',
  'https://i.postimg.cc/DzTsDH2r/Picsart-25-07-12-19-06-59-338.png'
  // No se cachean las fuentes de FontAwesome (woff2) porque son muchas y pueden cambiar.
  // El navegador las manejará con su propio caché.
];

// Evento de instalación: se abre el caché y se añaden los archivos principales.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Abriendo caché y guardando archivos principales');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Falló la instalación del caché', error);
      })
  );
});

// Evento de activación: se limpia el caché antiguo para evitar conflictos.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Limpiando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Toma el control inmediato de la página
});

// Evento fetch: intercepta las peticiones de red.
// Estrategia: "Cache First" para los recursos de la app.
// Si el recurso está en el caché, lo devuelve. Si no, va a la red.
self.addEventListener('fetch', event => {
  // Solo se aplica la estrategia de caché a las peticiones GET.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si se encuentra en caché, se devuelve la respuesta del caché.
        if (response) {
          // console.log('Service Worker: Recurso encontrado en caché:', event.request.url);
          return response;
        }

        // Si no está en caché, se va a la red.
        // console.log('Service Worker: Recurso no encontrado en caché, buscando en red:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Si la respuesta de red es válida, se clona, se guarda en caché y se devuelve.
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Es importante clonar la respuesta. Una respuesta es un stream
            // y solo puede ser consumida una vez. Como queremos que el navegador
            // la use y también guardarla en caché, necesitamos dos copias.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
            // Si la red falla (y no está en caché), se podría mostrar una página offline.
            console.error('Service Worker: Error de fetch, no se pudo obtener el recurso.', error);
            // Opcional: Devolver una página de fallback offline.
            // return caches.match('offline.html');
        });
      })
  );
});

