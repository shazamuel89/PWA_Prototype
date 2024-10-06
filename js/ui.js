document.addEventListener("DOMContentLoaded", function() {
    // Sidenav Initialization
    const menus = document.querySelector(".sidenav");
    M.Sidenav.init(menus, { edge: "left" });
    // 
    const forms = document.querySelectorAll("select");
    var instances = M.FormSelect.init(forms);
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
    .register("/serviceworker.js")
    .then((req) => console.log("Service Worker registered!", req))
    .catch((err) => console.log("Service Worker registration failed", err));
}