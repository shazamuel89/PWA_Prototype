import { openDB } from "https:unpkg.com/idb?module";

document.addEventListener("DOMContentLoaded", function() {
    // Sidenav Initialization
    const menus = document.querySelector(".sidenav");
    M.Sidenav.init(menus, { edge: "left" });
    // Initializes select elements with materialize fonts
    const forms = document.querySelectorAll("select");
    var instances = M.FormSelect.init(forms);

    loadTransfers();

    checkStorageUsage();
});

// Check if browser supports service workers, if so, register service worker
if ("serviceWorker" in navigator) { // If service worker works in browser (navigator represents browser)
    navigator.serviceWorker
        .register("/serviceworker.js") // Register service worker with this file path
        .then((reg) => console.log("Service Worker registered!", reg)) // On successful registration, log a confirmation message and registration object
        .catch((err) => console.log("Service Worker registration failed.", err)); // If not supported by browser, log failed registration message with error details
}

// Create indexDB database
async function createDB() {
    const db = await openDB("budgetTracker", 1, { // Uses openDB to open a database named budgetTracker with the version 1
        upgrade(db) { // This is called if the database is being created for the first time or if the version number is updated
            if (!db.objectStoreNames.contains("transfers")) {
                const store = db.createObjectStore("transfers", { // Creates a table-like object store called transfers
                    keyPath: "id", // Specifies that each entry in "transfers" will have a unique identifier called "id" which is the primary key
                    autoIncrement: true, // Automatically assigns a unique, incrementing value to the "id" field for each transfer
                });
                store.createIndex("status", "status"); // Creates an index to refer to entries in object store, called "status". Index will use "status" property to lookup entries.
                console.log("Object store 'transfers' created.")
            }
        }
    });
    return db; // Returns the database to the calling function
}

// Add transfer
async function addTransfer(transfer) {
    const db = await createDB();

    // Start transfer
    const tx = db.transaction("transfers", "readwrite");
    const store = tx.objectStore("transfers");

    // Add transfer to store
    await store.add(transfer);

    // Complete transfer
    await tx.done;

    // Update storage usage
    checkStorageUsage();
}

// Delete transfer
async function deleteTransfer(id) {
    const db = await createDB();

    // Start transaction
    const tx = db.transaction("transfers", "readwrite");
    const store = tx.objectStore("transfers");

    // Delete transfer by id
    await store.delete(id);

    await tx.done;

    // Remove transfer from UI
    const transferCard = document.querySelector(`[data-id="${id}"]`);
    if (transferCard) {
        transferCard.remove();
    }

    // Update storage usage
    checkStorageUsage();
}

// Load transfers
async function loadTransfers() {
    const db = await createDB();

    // Start transaction
    const tx = db.transaction("transfers", "readonly");
    const store = tx.objectStore("transfers");

    // Get all transfers
    const transfers = await store.getAll();

    console.log(transfers);

    await tx.done;

    const transferContainer = document.querySelector(".transfers");
    transferContainer.innerHTML = "";
    transfers.forEach((transfer) => {
        displayTransfer(transfer);
    });
}

// Display transfer using the existing HTML structure
function displayTransfer(transfer) {
    const transferContainer = document.querySelector(".transfers");
    const html = `<li class="collection-item yellow lighten-3 black-text" data-id=${transfer.id}>
                        <div class="row valign-wrapper"
                             style="margin-bottom: 0;">
                            <!-- Small image icon -->
                            <div class="col s2 m1 l1">
                                <img src="/img/${transfer.type}.png"
                                     class="circle responsive-img"
                                     alt="${transfer.type} Icon">
                            </div>
                            <!-- Centered text next to icon -->
                            <div class="col s9 m10 l10">
                                <span class="black-text">
                                    ${transfer.type}: ${transfer.category} - $${transfer.amount} (${transfer.description})
                                </span>
                            </div>
                            <!-- Delete icon -->
                            <div class="col s1 m1 l1">
                                <button class="transfer-delete btn-flat" aria-label="Delete Transaction">
                                    <i class="material-icons black-text-darken-1">delete</i>
                                </button>
                            </div>
                        </div>
                    </li>`;
    transferContainer.insertAdjacentHTML("beforeend", html);

    // Attach delete event listener
    const deleteButton = transferContainer.querySelector(`[data-id="${transfer.id}"] .transfer-delete`);

    if (deleteButton) {
        deleteButton.addEventListener("click", () => deleteTransfer(transfer.id));
    }
}

// Add transfer button listener
const addTransferButton = document.querySelector(".add-transfer");
addTransferButton.addEventListener("click", async (event) => {
    const typeInput = document.querySelector("#type");
    const categoryInput = document.querySelector("#category");
    const amountInput = document.querySelector("#amount");
    const descriptionInput = document.querySelector("#description");

    // Create an object with the values of the transfer
    const transfer = {
        type: typeInput.options[typeInput.selectedIndex].text,
        category: categoryInput.value,
        amount: parseFloat(amountInput.value).toFixed(2),
        description: descriptionInput.value,
        status: "pending"
    };

    // Update the IndexedDB with the transfer
    await addTransfer(transfer);

    // Display the transfer
    displayTransfer(transfer);

    // Set the values in the fields back to the empty string
    typeInput.value = "";
    categoryInput.value = "";
    amountInput.value = "";
    descriptionInput.value = "";
});

async function checkStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
        const { usage, quota } = await navigator.storage.estimate();

        const usageInMB = (usage / (1024 * 1024)).toFixed(2);
        const quotaInMB = (quota / (1024 * 1024)).toFixed(2);

        console.log(`Storage used: ${usageInMB} MB of ${quotaInMB} MB`);

        // Update the UI
        const storageInfo = document.querySelector("#storage-info");
        if (storageInfo) {
            storageInfo.textContent = `Storage used: ${usageInMB} MB of ${quotaInMB} MB`;
        }

        if (usage / quota > 0.8) {
            const storageWarning = document.querySelector("#storage-warning");
            if (storageWarning) {
                storageWarning.textContent = "Warning: You are running low on data";
                storageWarning.style.display = "block";
            }
        } else {
            const storageWarning = document.querySelector("#storage-warning");
            if (storageWarning) {
                storageWarning.textContent = "";
                storageWarning.style.display = "none";
            }
        }
    }
}