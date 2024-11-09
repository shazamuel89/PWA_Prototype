import { openDB } from "https:unpkg.com/idb?module";

document.addEventListener("DOMContentLoaded", function() {
    // Sidenav Initialization
    const menus = document.querySelector(".sidenav");
    M.Sidenav.init(menus, { edge: "left" });
    // Initializes select elements with materialize fonts
    const forms = document.querySelectorAll("select");
    var instances = M.FormSelect.init(forms);

    loadtransactions();

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
            if (!db.objectStoreNames.contains("transactions")) {
                const store = db.createObjectStore("transactions", { // Creates a table-like object store called transactions
                    keyPath: "id", // Specifies that each entry in "transactions" will have a unique identifier called "id" which is the primary key
                    autoIncrement: true, // Automatically assigns a unique, incrementing value to the "id" field for each transaction
                });
                store.createIndex("status", "status"); // Creates an index to refer to entries in object store, called "status". Index will use "status" property to lookup entries.
                console.log("Object store 'transactions' created.")
            }
        }
    });
    return db; // Returns the database to the calling function
}

// Add transaction
async function addtransaction(transaction) {
    const db = await createDB();

    // Start transaction
    const tx = db.transaction("transactions", "readwrite");
    const store = tx.objectStore("transactions");

    // Add transaction to store
    await store.add(transaction);

    // Complete transaction
    await tx.done;

    // Update storage usage
    checkStorageUsage();
}

// Delete transaction
async function deletetransaction(id) {
    const db = await createDB();

    // Start transaction
    const tx = db.transaction("transactions", "readwrite");
    const store = tx.objectStore("transactions");

    // Delete transaction by id
    await store.delete(id);

    await tx.done;

    // Remove transaction from UI
    const transactionCard = document.querySelector(`[data-id="${id}"]`);
    if (transactionCard) {
        transactionCard.remove();
    }

    // Update storage usage
    checkStorageUsage();
}

// Load transactions
async function loadtransactions() {
    const db = await createDB();

    // Start transaction
    const tx = db.transaction("transactions", "readonly");
    const store = tx.objectStore("transactions");

    // Get all transactions
    const transactions = await store.getAll();

    console.log(transactions);

    await tx.done;

    const transactionContainer = document.querySelector(".transactions");
    transactionContainer.innerHTML = "";
    transactions.forEach((transaction) => {
        displaytransaction(transaction);
    });
}

// Display transaction using the existing HTML structure
function displaytransaction(transaction) {
    const transactionContainer = document.querySelector(".transactions");
    const html = `<li class="collection-item yellow lighten-3 black-text" data-id=${transaction.id}>
                        <div class="row valign-wrapper"
                             style="margin-bottom: 0;">
                            <!-- Small image icon -->
                            <div class="col s2 m1 l1">
                                <img src="/img/${transaction.type}.png"
                                     class="circle responsive-img"
                                     alt="${transaction.type} Icon">
                            </div>
                            <!-- Centered text next to icon -->
                            <div class="col s9 m10 l10">
                                <span class="black-text">
                                    ${transaction.type}: ${transaction.category} - $${transaction.amount} (${transaction.description})
                                    <br>${transaction.date}
                                </span>
                            </div>
                            <!-- Delete icon -->
                            <div class="col s1 m1 l1">
                                <button class="transaction-delete btn-flat" aria-label="Delete Transaction">
                                    <i class="material-icons black-text-darken-1">delete</i>
                                </button>
                            </div>
                        </div>
                    </li>`;
    transactionContainer.insertAdjacentHTML("beforeend", html);

    // Attach delete event listener
    const deleteButton = transactionContainer.querySelector(`[data-id="${transaction.id}"] .transaction-delete`);

    if (deleteButton) {
        deleteButton.addEventListener("click", () => deletetransaction(transaction.id));
    }
}

// Add transaction button listener
const addtransactionButton = document.querySelector(".add-transaction");
addtransactionButton.addEventListener("click", async (event) => {
    const typeInput = document.querySelector("#type");
    const categoryInput = document.querySelector("#category");
    const amountInput = document.querySelector("#amount");
    const descriptionInput = document.querySelector("#description");
    const dateInput = document.querySelector("#date");

    const [year, month, day] = dateInput.value.split("-");

    // Create an object with the values of the transaction
    const transaction = {
        type: typeInput.options[typeInput.selectedIndex].text,
        category: categoryInput.value,
        amount: parseFloat(amountInput.value).toFixed(2),
        description: descriptionInput.value,
        date: `${month}-${day}-${year.slice(-2)}`,
        status: "pending"
    };

    // Update the IndexedDB with the transaction
    await addtransaction(transaction);

    // Display the transaction
    displaytransaction(transaction);

    // Set the values in the fields back to the empty string
    typeInput.value = "";
    categoryInput.value = "";
    amountInput.value = "";
    descriptionInput.value = "";
    dateInput.value = "";
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