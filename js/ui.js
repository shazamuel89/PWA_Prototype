import {
    openDB
} from "https://unpkg.com/idb?module";
import {
    addTransactionToFirebase,
    deleteTransactionFromFirebase,
    getTransactionsFromFirebase,
    updateTransactionInFirebase
} from "./firebaseDB.js";
import {
    messaging
} from "./firebaseConfig.js";
import {
    onMessage,
    getToken
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging.js";
import {
    collection,
    doc,
    addDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
    currentUser
} from "./auth.js";

const STORAGE_THRESHOLD = 0.8;
let serviceWorkerRegistration = null;

// Declaring input variables here to make code more concise
let typeInput, amountInput, dateInput, categoryInput, descriptionInput, transactionIdInput, formActionButton;

document.addEventListener("DOMContentLoaded", function () {
    // Initialize form variables to make code more readable
    typeInput = document.querySelector("#type");
    amountInput = document.querySelector("#amount");
    dateInput = document.querySelector("#date");
    categoryInput = document.querySelector("#category");
    descriptionInput = document.querySelector("#description");
    transactionIdInput = document.querySelector("#transaction-id");
    formActionButton = document.querySelector("#form-action-btn");

    // Add event listeners to all form inputs
    [typeInput, amountInput, dateInput, categoryInput, descriptionInput].forEach(input => {
        input.addEventListener("input", toggleButtonState); // Listen for input changes
    });
    formActionButton.addEventListener("click", addOrEditTransactionButton);
    toggleButtonState();

    // Sidenav Initialization
    const menus = document.querySelector(".sidenav");
    M.Sidenav.init(menus, { edge: "left" });

    // Initializes select elements with materialize fonts
    const forms = document.querySelectorAll("select");
    var instances = M.FormSelect.init(forms);

    // Initially have the add transaction button say "Add Transaction"
    formActionButton.textContent = "Add Transaction";
    formActionButton.classList.remove("red") // Remove red from the class list if it is there
    formActionButton.classList.add("green"); // Initialize the color to represent adding
    checkStorageUsage();
    requestPersistentStorage();

    // Add event listener for the "Enable Notifications" button
    const notificationButton = document.getElementById("enable-notifications-btn");
    if (notificationButton) {
        notificationButton.addEventListener("click", initNotificationPermission);
    }
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
export async function syncTransactions() {
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

// Returns true if every input field is not empty, false otherwise
function formIsValid() {
    return (
        typeInput.value &&
        amountInput.value &&
        dateInput.value &&
        categoryInput.value.trim() &&
        descriptionInput.value.trim()
    );
}

// Toggles submit button state
function toggleButtonState() {
    if (formIsValid()) {
        formActionButton.disabled = false; // Enable button
    } else {
        formActionButton.disabled = true; // Disable button
    }
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
export async function loadTransactions() {
    const db = await getDB();

    const transactionContainer = document.querySelector(".transactions");
    transactionContainer.innerHTML = ""; // Clear current transactions

    // This is for adding up final balance of all transactions
    const transactionAmounts = [];

    if (isOnline()) {
        const firebaseTransactions = await getTransactionsFromFirebase();
        // Start transaction (read-write)
        const tx = db.transaction("transactions", "readwrite");
        const store = tx.objectStore("transactions");

        for (const transaction of firebaseTransactions) {
            await store.put({ ...transaction, synced: true });
        }
        // Sort the transactions just before displaying them
        sortTransactions(firebaseTransactions);

        for (const transaction of firebaseTransactions) {
            displayTransaction(transaction);
            transactionAmounts.push({ type: transaction.type, amount: transaction.amount });
        }
        await tx.done;
    } else {
        // Start transaction (read-write, writing is to ensure correct sorting by date)
        const tx = db.transaction("transactions", "readonly");
        const store = tx.objectStore("transactions");
        // Get all transactions
        const transactions = await store.getAll();

        // Sort the transactions
        sortTransactions(transactions);

        // Then display transactions
        for (const transaction of transactions) {
            displayTransaction(transaction);
            transactionAmounts.push({ type: transaction.type, amount: transaction.amount });
        };
        // Complete transaction
        await tx.done;
    }
    // Finally, display data calculated from transactions
    displayBudgetData(transactionAmounts);
}

// This sorts transactions by date (potentially could add a choice of sorting method)
function sortTransactions(transactions) {
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// This function takes an array of transaction types and amounts and calculates and displays the budget data based on it
function displayBudgetData(transactionAmounts) {
    var totalIncome = 0;
    var totalExpenses = 0;
    var totalBalance = 0;

    transactionAmounts.forEach((transaction) => {
        const amount = parseFloat(transaction.amount);
        if (transaction.type === "Income") { // If transaction is income
            totalIncome += amount;
            totalBalance += amount;
        } else if (transaction.type === "Expense") { // If transaction is expense
            totalExpenses += amount;
            totalBalance -= amount;
        }
    });

    // Update values in balance card
    const balanceContainer = document.querySelector(".balance");
    const balanceHTML = 
        `<span class="card-title">
            Current Balance: $${totalBalance.toFixed(2)}
        </span>
        <p>
            Total Income: $${totalIncome.toFixed(2)}
        </p>
        <p>
            Total Expenses: $${totalExpenses.toFixed(2)}
        </p>`;
    balanceContainer.innerHTML = balanceHTML;

    // Update values in summary
    var progressBarPercentage = (totalBalance < 0) ? 0 : ((totalBalance / totalIncome) * 100);
    const summaryContainer = document.querySelector(".summary");
    const summaryHTML = 
        `<h5 class="teal-text text-darken-2">
            Budget Overview
        </h5>
        <p>
            Total Monthly Budget: $2000 <strong>*Please note that Monthly Budget is a Work In Progress!*</strong>
        </p>
        <p>
            Remaining: $550.00 <strong>*Please note that Monthly Budget is a Work In Progress!*</strong>
        </p>
        <div class="progress red lighten-2 z-depth-2"
             style="height: 1rem;">
            <div class="determinate"
                 style="width: ${progressBarPercentage}%; background-color: #66BB6A;">
            </div>
        </div>`;
    summaryContainer.innerHTML = summaryHTML;
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
                                    <i class="material-icons black-text-darken-1">edit</i>
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
    editButton.addEventListener("click", () => {
        openEditForm(transaction.id, transaction.type, transaction.amount, transaction.date, transaction.category, transaction.description)
        const editFormElement = document.getElementById("add-or-edit-form");
        if (editFormElement) {
            editFormElement.scrollIntoView({ behavior: "smooth" });
        }
    });
}

// Add/Edit transaction button listener
async function addOrEditTransactionButton() {
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
};

// Open Edit form with existing transaction data
function openEditForm(id, type, amount, date, category, description) {
    // Fill in form with existing transaction data
    // Get type value that works with select element
    if (type == "Income") {
        typeInput.value = "1";
    }
    else if (type == "Expense") {
        typeInput.value = "2";
    }
    amountInput.value = amount;
    const [month, day, year] = date.split("-");
    dateInput.value = `20${year}-${month}-${day}`;
    categoryInput.value = category;
    descriptionInput.value = description;
    transactionIdInput.value = id; // Set transactionId for the edit operation
    formActionButton.textContent = "Edit Transaction"; // Change the button text to "Edit Transaction"
    formActionButton.classList.remove("green"); // Remove green from the class list if it is there
    formActionButton.classList.add("red"); // And change the color to represent editing

    M.FormSelect.init(typeInput); // Reinitialize the select element
    M.updateTextFields(); // Materialize CSS form update
    toggleButtonState();
}

// Helper function to reset form after use
function clearForm() {
    typeInput.value = "";
    amountInput.value = "";
    dateInput.value = "";
    categoryInput.value = "";
    descriptionInput.value = "";
    transactionIdInput.value = ""; // Set transactionId for the edit operation
    formActionButton.textContent = "Add Transaction"; // Change the button text to "Add Transaction"
    formActionButton.classList.remove("red"); // Remove red from class list if it is there
    formActionButton.classList.add("green"); // And change the color to represent adding
    toggleButtonState();
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
        const isPersistent = await navigator.storage.persist();
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

// Function to request notification permission and retrieve FCM token
async function initNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            if (!serviceWorkerRegistration) { // Wait until service worker is ready
                serviceWorkerRegistration = await navigator.serviceWorker.ready;
            }
            const token = await getToken(messaging, {
                vapidKey: "BNdDE2u4JVSjtXpZkoDB85EipWnUaXKVXcb2koG1tV9dRfR0ER8XRsAyIU5bGtk8dQAoLn0a7tNu-mfRjHhywE4",
                serviceWorkerRegistration: serviceWorkerRegistration
            });
            console.log("FCM Token: ", token);
            
            if (token && currentUser) {
                // Ensure we have a valid currentUser and token before saving
                const userRef = doc(db, "users", currentUser.uid);
                const tokenRef = collection(userRef, "fcmTokens");

                // Try saving the token in Firestore
                await addDoc(tokenRef, { token: token });
                console.log("Token saved to Firestore successfully");
            } else {
                console.log("No valid user or token found.");
            }
        } else {
            console.log("Notification permission denied.");
        }
    } catch (error) {
        console.error("Error requesting notification permission: ", error);
    }
}

// Initialize and handle foreground messages
onMessage(messaging, (payload) => {
    console.log("Message received. ", payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: "/img/icons/favicon-192x192.png"
    };
    new Notification(notificationTitle, notificationOptions);
});
window.initNotificationPermission = initNotificationPermission;

setInterval(async () => {
    const now = new Date();
    const transactions = await getTransactionsFromFirebase(); // Fetch all transactions from Firestore
    transactions.forEach((transaction) => {
        const reminderDate = new Date(transaction.reminderDate);
        if (reminderDate <= now && !transaction.notified) {
            // Show local notification
            new Notification("Reminder", {
                body: `Reminder for: ${transaction.title}`,
                icon: "/img/icons/favicon-192x192.png"
            });
            // Update transaction to mark as notified
            transaction.notified = true;
            updateTransactionInFirebase(transaction.id, { notified: true });
        }
    });
}, 60 * 60 * 1000); // Check every hour

function getGeolocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            // Store the latitude and longitude in hidden input fields
            document.getElementById("latitude").value = latitude;
            document.getElementById("longitide").value = longitude;

            // Update the UI to show location status
            document.getElementById("location-status").textContent = `Location set: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        }, (error) => {
            console.error("Error getting location: ", error);
            document.getElementById("location-status").textContent = "Unable to retrieve location.";
        });
    } else {
        document.getElementById("location-status").textContent = "Geolocation not supported.";
    }
}
window.getGeolocation = getGeolocation;