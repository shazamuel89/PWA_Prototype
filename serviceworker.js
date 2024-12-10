// Import Firebase libraries using importScripts
importScripts("https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js");

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyD89_R4P0IqKnNct05I9n_udz-iF3WHYY8",
    authDomain: "budgettracker-b8d7c.firebaseapp.com",
    projectId: "budgettracker-b8d7c",
    storageBucket: "budgettracker-b8d7c.firebasestorage.app",
    messagingSenderId: "1055163160411",
    appId: "1:1055163160411:web:60a82d7c4804e492f62c7e",
    vapidKey: "BNdDE2u4JVSjtXpZkoDB85EipWnUaXKVXcb2koG1tV9dRfR0ER8XRsAyIU5bGtk8dQAoLn0a7tNu-mfRjHhywE4"
});

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
    console.log("[serviceworker.js] Received background message ", payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: "/img/icons/favicon-192x192.png"
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// version number is checked upon page reload, if new v#, then reloads cache
const CACHE_NAME = "budget-tracker-v10";
// These are the assets that will be cached
const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/pages/about.html",
    "/pages/contact.html",
    "/pages/profile.html",
    "/pages/auth.html",
    "/css/materialize.min.css",
    "/js/materialize.min.js",
    "/js/ui.js",
    "/img/Expense.png",
    "/img/Income.png"
];

// This is the install event
self.addEventListener("install", (event) => { // self refers to service worker. Upon install event triggered by registering SW in ui.js:
    event.waitUntil( // Waits until done caching assets before finishing SW installation
        caches.open(CACHE_NAME) // Open a cache with the name CACHE_NAME
              .then((cache) => { // After opening the cache, the returned cache object allows us to add assets to it
                return cache.addAll(ASSETS_TO_CACHE); // Add wanted assets to cache
              })
    );
});

// This is the activate event
self.addEventListener("activate", (event) => { // Upon activate event triggered by SW installation completion
    event.waitUntil( // Ensure SW is fully activated before considering activation complete
        caches.keys().then((cacheNames) => { // caches.keys() gets all names of caches in browser storage, and stores them in cacheNames as an array of cache names
            return Promise.all( // Promise.all takes an array of promises as input, and only resolves itself when each promise in the array is fulfilled
                cacheNames.map((cache) => { // map takes the list of cacheNames and applies the function to each of the elements
                    if (cache !== CACHE_NAME) { // if the cache element does not have the same name as the current cache version name
                        return caches.delete(cache); // And return after deleting the cache, resolving that promise
                    }
                })
            );
        })
    );
});

// This is the fetch event
self.addEventListener("fetch", (event) => { // Upon fetch event triggered by requesting a resource
    event.respondWith( // Respond to the event request with
        (async function() {
            // Only cache get requests
            if (event.request.method !== "GET") {
                return fetch(event.request);
            }
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }
            try {
                const networkResponse = await fetch(event.request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, networkResponse.clone()); // Update cache with the fetched response
                return networkResponse;
            } catch (error) {
                console.error("Fetch failed, returning offline page: ", error);
                // Optionally, return an offline page here if available in the cache
            }
        })()
    );
});

// Listen for messages from ui.js
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "FCM_TOKEN") {
        const fcmToken = event.data.token;
        console.log("Received FCM token in service worker: ", fcmToken);
        // Here you might store or use the token as needed for push notifications
    }
});

// Display notification for background message
self.addEventListener("push", (event) => {
    if (event.data) {
        const payload = event.data.json();
        const { title, body, icon } = payload.notification;
        const options = {
            body,
            icon: icon || "/img/icons/favicon-192x192.png"
        };
        event.waitUntil(self.registration.showNotification(title, options));
    }
});