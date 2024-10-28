document.addEventListener("DOMContentLoaded", function() {
    // Sidenav Initialization
    const menus = document.querySelector(".sidenav");
    M.Sidenav.init(menus, { edge: "left" });
    // Initializes select elements with materialize fonts
    const forms = document.querySelectorAll("select");
    var instances = M.FormSelect.init(forms);
});

// Check if browser supports service workers, if so, register service worker
if ("serviceWorker" in navigator) { // If service worker works in browser (navigator represents browser)
    navigator.serviceWorker
        .register("/serviceworker.js") // Register service worker with this file path
        .then((reg) => console.log("Service Worker registered!", reg)) // On successful registration, log a confirmation message and registration object
        .catch((err) => console.log("Service Worker registration failed.", err)); // If not supported by browser, log failed registration message with error details
}