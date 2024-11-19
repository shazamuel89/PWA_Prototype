// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD89_R4P0IqKnNct05I9n_udz-iF3WHYY8",
  authDomain: "budgettracker-b8d7c.firebaseapp.com",
  projectId: "budgettracker-b8d7c",
  storageBucket: "budgettracker-b8d7c.firebasestorage.app",
  messagingSenderId: "1055163160411",
  appId: "1:1055163160411:web:60a82d7c4804e492f62c7e",
  measurementId: "G-GKTE617NSD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add a Transaction
export async function addTransactionToFirebase(transaction) {
    try {
        const docRef = await addDoc(collection(db, "transactions"), transaction);
        return {id: docRef.id, ...transaction};
    } catch(error) {
        console.error("Error adding transaction: ", error);
    }
}

// Get Transactions
export async function getTransactionsFromFirebase() {
    const transactions = [];
    try {
        const querySnapshot = await getDocs(collection(db, "transactions"));
        querySnapshot.forEach((doc) => {
            transactions.push({id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error("Error retrieving transactions: ", error);
    }
    return transactions;
}

// Delete Transaction
export async function deleteTransactionFromFirebase(id) {
    try {
        await deleteDoc(doc(db, "transactions", id));
    } catch (error) {
        console.error("Error deleting transaction: ", error);
    }
}

// Update Transaction
export async function updateTransactionInFirebase(id, updatedData) {
    try {
        const transactionRef = doc(db, "transactions", id);
        await updateDoc(transactionRef, updatedData);
    } catch (error) {
        console.error("Error updating transaction: ", error);
    }
}