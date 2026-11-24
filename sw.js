"use strict";

const CACHE_NAME = "englishrush-shell-v2";

const CORE_ASSETS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names
                    .filter(name =>
                        name.startsWith("englishrush-shell-") &&
                        name !== CACHE_NAME
                    )
                    .map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    const url = new URL(request.url);

    if (
        request.method !== "GET" ||
        url.origin !== self.location.origin
    ) {
        return;
    }

    // Страницы: сначала сеть, затем локальный кэш.
    if (request.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    const response = await fetch(request);

                    if (response.ok) {
                        const cache = await caches.open(CACHE_NAME);
                        await cache.put(
                            "./index.html",
                            response.clone()
                        );
                    }

                    return response;
                } catch {
                    const cached = await caches.match("./index.html");

                    if (cached) return cached;

                    return caches.match("./");
                }
            })()
        );

        return;
    }

    // Статические файлы: сначала кэш.
    event.respondWith(
        (async () => {
            const cached = await caches.match(request);

            if (cached) return cached;

            try {
                const response = await fetch(request);

                if (response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(request, response.clone());
                }

                return response;
            } catch {
                return new Response("Resource unavailable offline.", {
                    status: 503,
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8"
                    }
                });
            }
        })()
    );
});