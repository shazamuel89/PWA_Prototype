// version number is checked upon page reload, if new v#, then reloads cache
const CACHE_NAME = "budget-tracker-v10";

// These are the assets that will be cached
const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/pages/about.html",
    "/pages/contact.html",
    "/css/materialize.min.css",
    "/js/materialize.min.js",
    "/js/ui.js",
    "/js/firebaseDB.js",
    "/img/Expense.png",
    "/img/Income.png",
    "/img/icons/favicon-192x192.png",
    "/img/icons/favicon-16x16.png",
    "/img/screenshots/screenshot_add_income.png",
    "/img/screenshots/screenshot_add_expense.png",
    "/manifest.json"
];

// This is the install event
self.addEventListener("install", (event) => { // self refers to service worker. Upon install event triggered by registering SW in ui.js:
    console.log("Service Worker: Installing..."); // Output in console that SW is installing
    event.waitUntil( // Waits until done caching assets before finishing SW installation
        caches.open(CACHE_NAME) // Open a cache with the name CACHE_NAME
              .then((cache) => { // After opening the cache, the returned cache object allows us to add assets to it
                console.log("Service Worker: Caching files..."); // Log to console that files are being cached
                return cache.addAll(ASSETS_TO_CACHE); // Add wanted assets to cache
              })
    );
});


// This is the activate event
self.addEventListener("activate", (event) => { // Upon activate event triggered by SW installation completion
    console.log("Service Worker: Activating..."); // First log the beginning of activation
    event.waitUntil( // Ensure SW is fully activated before considering activation complete
        caches.keys().then((cacheNames) => { // caches.keys() gets all names of caches in browser storage, and stores them in cacheNames as an array of cache names
            return Promise.all( // Promise.all takes an array of promises as input, and only resolves itself when each promise in the array is fulfilled
                cacheNames.map((cache) => { // map takes the list of cacheNames and applies the function to each of the elements
                    if (cache !== CACHE_NAME) { // if the cache element does not have the same name as the current cache version name
                        console.log("Service Worker: Deleting old cache..."); // Then log that old cache is being deleted
                        return caches.delete(cache); // And return after deleting the cache, resolving that promise
                    }
                })
            );
        })
    );
});


// This is the fetch event
self.addEventListener("fetch", (event) => { // Upon fetch event triggered by requesting a resource
    console.log("Service Worker: Fetching...", event.request.url); // Log that the SW is fetching the requested url
    event.respondWith( // Respond to the event request with
        caches.match(event.request).then((cachedResponse) => { // caches.match checks if request exists in cache, and returns cached response if found or undefined if not
            if (cachedResponse) { // If requested resource is in cache
                return cachedResponse; // Then return that cached resource
            } // Otherwise
            return fetch(event.request).then((networkResponse) => { // Fetch the request as networkResponse
                return caches.open(CACHE_NAME).then((cache) => { // Open the cache with the current name, then
                    cache.put(event.request, networkResponse.clone()); // Put a copy of the networkResponse in the requested location in the cache
                    return networkResponse; // Then return the networkResponse for the user
                });
            });
        })
    );
});