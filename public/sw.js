// Service worker do Elo Mídia — PWA "casca fina".
//
// Por design, este service worker só lida com recursos ESTÁTICOS e públicos:
// arquivos em /_next/static, ícones e a própria página /offline. Ele nunca
// intercepta páginas autenticadas, chamadas de API/Server Actions ou
// requisições para o Supabase (origem diferente) — o app exige internet para
// todas as operações. Isso evita guardar dados de uma sessão em cache e
// vazá-los depois de logout ou troca de igreja.

const CACHE_NAME = "elo-midia-static-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isCacheableStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname === "/favicon.ico")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navegação de página: tenta a rede; se falhar (offline), mostra a página
  // de fallback. Nunca serve páginas autenticadas do cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Recursos estáticos públicos: cache-first, com atualização em segundo plano.
  if (isCacheableStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }

  // Qualquer outra requisição (API, Server Actions, Supabase, anexos) segue
  // direto para a rede, sem passar pelo service worker.
});
