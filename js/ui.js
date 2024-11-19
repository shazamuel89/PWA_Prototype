import { openDB } from "https:unpkg.com/idb?module";
import { addTransactionToFirebase, deleteTransactionFromFirebase, getTransactionsFromFirebase, updateTransactionInFirebase } from "/js/firebaseDB.js";

const STORAGE_THRESHOLD = 0.8;

document.addEventListener("DOMContentLoaded", function () {
    // Sidenav Initialization
    const menus = document.querySelector(".sidenav");
    M.Sidenav.init(menus, { edge: "left" });
    // Initializes select elements with materialize fonts
    const forms = document.querySelectorAll("select");
    var instances = M.FormSelect.init(forms);

    // Load transactions from the IndexedDB
    loadTransactions();
    syncTransactions();
    // Check storage usage
    checkStorageUsage();
    // Request persistent storage
    requestPersistentStorage();
});

// Check if browser supports service workers, if so, register service worker
if ("serviceWorker" in navigator) { // If service worker works in browser (navigator represents browser)
    navigator.serviceWorker
        .register("/serviceworker.js") // Register service worker with this file path
        .then((reg) => console.log("Service Worker registered!", reg)) // On successful registration, log a confirmation message and registration object
        .catch((err) => console.log("Service Worker registration failed.", err)); // If not supported by browser, log failed registration message with error details
}

// Create or Get IndexedDB database instance
let dbPromise;
async function getDB() {
    if (!dbPromise) {
        dbPromise = openDB("budgetTracker", 1, { // Uses openDB to open a database named budgetTracker with the version 1
            upgrade(db) { // This is called if the database is being created for the first time or if the version number is updated
                const store = db.createObjectStore("transactions", { // Creates a table-like object store called transactions
                    keyPath: "id", // Specifies that each entry in "transactions" will have a unique identifier called "id" which is the primary key
                    autoIncrement: true, // Automatically assigns a unique, incrementing value to the "id" field for each transaction
                });
                store.createIndex("type", "type"); // Creates an index to refer to entries in object store, called "type". Index will use "type" property to lookup entries.
                store.createIndex("synced", "synced");
            }
        });
    }
    return dbPromise; // Returns the database to the calling function
}

// Sync unsynced transactions from IndexedDB to Firebase
async function syncTransactions() {
    const db = await getDB();
    const tx = db.transaction("transactions", "readonly");
    const store = tx.objectStore("transactions");

    // Fetch all unsynced transactions
    const transactions = await store.getAll();
    await tx.done;

    for (const transaction of transactions) {
        if (!transaction.synced && isOnline()) {
            try {
                const transactionToSync = {
                    type: transaction.type,
                    amount: transaction.amount,
                    date: transaction.date,
                    category: transaction.category,
                    description: transaction.description
                };

                // Send the transactions to Firebase
                const savedTransaction = await addTransactionToFirebase(transactionToSync);

                // Replace temporary ID with Firebase ID
                const txUpdate = db.transaction("transactions", "readwrite");
                const storeUpdate = txUpdate.objectStore("transactions");

                await storeUpdate.delete(transaction.id);
                await storeUpdate.put({ ...transaction, id: savedTransaction.id, synced: true});
                await txUpdate.done;
            } catch(error) {
                console.error("Error syncing transaction: ", error);
            }
        }
    }
}

// Check if the app is online
function isOnline() {
    return navigator.onLine;
}

// Add transaction
async function addTransaction(transaction) {
    const db = await getDB();

    let transactionId;

    if (isOnline()) { // Online - Add transaction to Firebase and get the Firebase ID
        const savedTransaction = await addTransactionToFirebase(transaction);
        transactionId = savedTransaction.id;

        // Add Transaction with Firebase ID to IndexedDB for consistency
        const tx = db.transaction("transactions", "readwrite");
        const store = tx.objectStore("transactions");
        await store.put({ ...transaction, id: transactionId, synced: true });
        await tx.done;
    } else { // Offline - Ensure a unique temporary ID is generated if none exists
        transactionId = `temp-${Date.now()}`;

        // Check if transactionId is valid before adding to IndexedDB
        const transactionToStore = { ...transaction, id: transactionId, synced: false };
        if (!transactionToStore.id) {
            console.error("Failed to generate a valid ID for the transaction.");
            return; // Exit if ID is invalid
        }

        // Start transaction
        const tx = db.transaction("transactions", "readwrite");
        const store = tx.objectStore("transactions");
        // Add transaction to store
        await store.put(transactionToStore);
        // Complete transaction
        await tx.done;
    }
    // Update storage usage
    checkStorageUsage();

    // Return transaction with ID
    return { ...transaction, id: transactionId };
}

// Edit transaction using a transaction
async function editTransaction(id, updatedData) {
    if (!id) {
        console.error("Invalid ID passed to editTransaction");
        return;
    }
    const db = await getDB();
    if (isOnline()) { // Online - Edit transaction in Firebase
        try {
            await updateTransactionInFirebase(id, updatedData);
            // Update Transaction with Firebase ID in IndexedDB for consistency
            const tx = db.transaction("transactions", "readwrite");
            const store = tx.objectStore("transactions");
            await store.put({ ...updatedData, id: id, synced: true });
            await tx.done;
            // Reload the transaction list to reflect the updates
            loadTransactions();
        } catch (error) {
            console.error("Error updating transaction in Firebase: ", error);
        }
    } else { // Offline - Make an indexedDB transaction
        const tx = db.transaction("transactions", "readwrite");
        const store = tx.objectStore("transactions");
        await store.put({ ...updatedData, id: id, synced: false });
        await tx.done;
        loadTransactions(); // Refresh UI with updated transactions
    }
}

// Delete transaction
async function deleteTransaction(id) {
    if (!id) {
        console.error("Invalid Id passed to deleteTransaction");
        return;
    }
    const db = await getDB();
    if (isOnline()) {
        await deleteTransactionFromFirebase(id);
    }
    // Start transaction
    const tx = db.transaction("transactions", "readwrite");
    const store = tx.objectStore("transactions");
    
    try {
        // Delete transaction by id
        await store.delete(id);
    } catch (error) {
        console.error("Error deleting the transaction from IndexedDB: ", error);
    }
    // Complete transaction
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
async function loadTransactions() {
    const db = await getDB();

    const transactionContainer = document.querySelector(".transactions");
    transactionContainer.innerHTML = ""; // Clear current tasks

    if (isOnline()) {
        const firebaseTransactions = await getTransactionsFromFirebase();
        // Start transaction (read-write)
        const tx = db.transaction("transactions", "readwrite");
        const store = tx.objectStore("transactions");

        for (const transaction of firebaseTransactions) {
            await store.put({ ...transaction, synced: true });
            displayTransaction(transaction);
        }
        await tx.done;
    } else {
        // Start transaction (read-only)
        const tx = db.transaction("transactions", "readonly");
        const store = tx.objectStore("transactions");
        // Get all transactions
        const transactions = await store.getAll();
        transactions.forEach((transaction) => {
        displayTransaction(transaction);
        });
        // Complete transaction
        await tx.done;
    }

    
}

// Display transaction using the existing HTML structure
function displayTransaction(transaction) {
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
                            <!-- Edit icon -->
                            <div class="col s1 m1 l1">
                                <button class="transaction-edit btn-flat" aria-label="Edit Transaction">
                                    <i class="material-icons black-text-darken-1">delete</i>
                                </button>
                            </div>
                        </div>
                    </li>`;
    transactionContainer.insertAdjacentHTML("beforeend", html);

    // Attach delete event listener
    const deleteButton = transactionContainer.querySelector(
        `[data-id="${transaction.id}"] .transaction-delete`
    );
    deleteButton.addEventListener("click", () => deleteTransaction(transaction.id));

    // Attach edit event listener
    const editButton = transactionContainer.querySelector(
        `[data-id="${transaction.id}"] .transaction-edit`
    );
    editButton.addEventListener("click", () => 
        openEditForm(transaction.id, transaction.type, transaction.amount, transaction.date, transaction.category, transaction.description)
    );
}

// Add/Edit transaction button listener
const addTransactionButton = document.querySelector("#form-action-btn");
addTransactionButton.addEventListener("click", async () => {
    const typeInput = document.querySelector("#type");
    const amountInput = document.querySelector("#amount");
    const dateInput = document.querySelector("#date");
    const categoryInput = document.querySelector("#category");
    const descriptionInput = document.querySelector("#description");
    const transactionIdInput = document.querySelector("#transaction-id");
    const formActionButton = document.querySelector("#form-action-btn");
    // Prepare the transaction data
    const transactionId = transactionIdInput.value; // If editing, this will have a value
    
    const [year, month, day] = dateInput.value.split("-"); // Get individual date values
    const transactionData = {
        type: typeInput.options[typeInput.selectedIndex].text,
        amount: parseFloat(amountInput.value).toFixed(2),
        date: `${month}-${day}-${year.slice(-2)}`,
        category: categoryInput.value,
        description: descriptionInput.value
    };
    if (!transactionId) { // If no transactionId, we are adding a new transaction
        // Update the IndexedDB with the transaction
        const savedTransaction = await addTransaction(transactionData);
        displayTransaction(savedTransaction); // Display new transaction in the UI
    } else { // If transactionId exists, we are editing an existing transaction
        await editTransaction(transactionId, transactionData); // Edit transaction in Firebase and IndexedDB
    }
    // Set the values in the fields back to the empty string
    clearForm();
});

// Open Edit form with existing transaction data
function openEditForm(id, type, amount, date, category, description) {
    const typeInput = document.querySelector("#type");
    const amountInput = document.querySelector("#amount");
    const dateInput = document.querySelector("#date");
    const categoryInput = document.querySelector("#category");
    const descriptionInput = document.querySelector("#description");
    const transactionIdInput = document.querySelector("#transaction-id");
    const formActionButton = document.querySelector("form-action-btn");

    // Fill in form with existing transaction data
    typeInput.value = type;
    amountInput.value = amount;
    dateInput.value = date;
    categoryInput.value = category;
    descriptionInput.value = description;
    transactionIdInput.value = id; // Set transactionId for the edit operation
    formActionButton.textContent = "Edit"; // Change the button text to "Edit"

    M.updateTextFields(); // Materialize CSS form update
}

// Helper function to reset form after use
function clearForm() {
    const typeInput = document.querySelector("#type");
    const amountInput = document.querySelector("#amount");
    const dateInput = document.querySelector("#date");
    const categoryInput = document.querySelector("#category");
    const descriptionInput = document.querySelector("#description");
    const transactionIdInput = document.querySelector("#transaction-id");
    const formActionButton = document.querySelector("form-action-btn");

    typeInput.value = "";
    amountInput.value = "";
    dateInput.value = "";
    categoryInput.value = "";
    descriptionInput.value = "";
    transactionIdInput.value = ""; // Set transactionId for the edit operation
    formActionButton.textContent = "Add"; // Change the button text to "Edit"
}

// Function to check storage usage
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

        const storageWarning = document.querySelector("#storage-warning");
        if (usage / quota > STORAGE_THRESHOLD) {
            if (storageWarning) {
                storageWarning.textContent = "Warning: You are running low on data";
                storageWarning.style.display = "block";
            }
        } else if (storageWarning) {
            storageWarning.textContent = "";
            storageWarning.style.display = "none";
        }
    }
}

// Request persistent storage
async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersistent =  await navigator.storage.persist();
        console.log(`Persistent storage granted: ${isPersistent}`);

        const storageMessage = document.querySelector("#persistent-storage-info");
        if (storageMessage) {
            storageMessage.textContent = isPersistent
                ? "Persistent storage granted!"
                : "Data might be cleared under storage pressure.";
            storageMessage.classList.toggle("green-text", isPersistent);
            storageMessage.classList.toggle("red-text", !isPersistent);
        }
    }
}