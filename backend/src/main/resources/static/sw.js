/*
 * Service worker de TecniHardware (Acta 6 · uso sin conexión).
 * Guarda la aplicación (HTML, JS, CSS, fuentes e íconos) para que el panel abra aunque el
 * local se quede sin wifi. La API nunca se guarda aquí: los datos sin conexión los maneja la
 * propia aplicación (cola en IndexedDB, ver src/lib/sin-conexion.ts).
 */
const CACHE = 'tecnihardware-app-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['/', '/index.html']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/actuator')) return

  // Páginas: primero la red (para tener siempre la última versión); sin red, la copia.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copia))
          return r
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Archivos con hash en el nombre (assets/…): primero la copia; si no está, la red y se guarda.
  e.respondWith(
    caches.match(req).then(
      (guardado) =>
        guardado ||
        fetch(req).then((r) => {
          if (r.ok) {
            const copia = r.clone()
            caches.open(CACHE).then((c) => c.put(req, copia))
          }
          return r
        }),
    ),
  )
})
