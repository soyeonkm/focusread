// Adds the cross-origin isolation headers (COOP/COEP) to this site's own responses, so the web natural
// voice can use threads on any host without server config. Registered by src/lib/kitten.ts.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (!res.ok && res.status !== 304) return res;
      const headers = new Headers(res.headers);
      headers.set("Cross-Origin-Opener-Policy", "same-origin");
      headers.set("Cross-Origin-Embedder-Policy", "require-corp");
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }),
  );
});
