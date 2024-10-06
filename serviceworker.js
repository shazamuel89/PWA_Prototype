const CACHE_NAME = "task-manager-v1";

const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/pages/about.html",
    "/pages/contact.html",
    "/css/materialize.min.css",
    "/js/materialize.min.js",
    "/js/ui.js",
    "/img/expense.jpeg",
    "/img/income.jpeg"
];

// Install event
self.addEventListener("install", event => {
    console.log("Service worker: Installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Service worker: caching files");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate event
self.addEventListener("activate", (event) => {
    console.log("Service Worker: Activating...");
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log("Service Worker: Deleting old cache");
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch event
self.addEventListener("fetch", (event) => {
    console.log("Service Worker: Fetching...", event.request.url);
    event.respondWith(
        async function () {
            const response = await caches.match(event.request);
            if (response) {
                return response;
            }
            try {
                const networkResponse = await fetch(event.request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, networkResponse.clone()); // Update cache with new response
                return networkResponse;
            } catch (error) {
                console.error("Fetch failed, returning offline page: ", error);
                // Optionally, return an offline page here if available in the cache
            }
        }
    );
});