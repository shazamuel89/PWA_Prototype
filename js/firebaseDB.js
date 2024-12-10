import {
    currentUser
} from "./auth.js";
import {
    db
} from "./firebaseConfig.js";
import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDocs,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Add a Transaction
export async function addTransactionToFirebase(transaction) {
    try {
        if (!currentUser) {
            throw new Error("User is not authenticated");
        }
        const userId = currentUser.uid;
        console.log("userID: ", userId);
        const userRef = doc(db, "users", userId);
        await setDoc(
            userRef,
            {
                email: currentUser.email,
                name: currentUser.displayName
            },
            { merge: true }
        );
        const transactionsRef = collection(userRef, "transactions");
        const docRef = await addDoc(transactionsRef, transaction);
        return {id: docRef.id, ...transaction};
    } catch(error) {
        console.error("Error adding transaction: ", error);
    }
}

// Get Transactions
export async function getTransactionsFromFirebase() {
    const transactions = [];
    try {
        if (!currentUser) {
            throw new Error("User is not authenticated");
        }
        const userId = currentUser.uid;
        const transactionsRef = collection(doc(db, "users", userId), "transactions");
        const querySnapshot = await getDocs(transactionsRef);
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
        if (!currentUser) {
            throw new Error("User is not authenticated");
        }
        const userId = currentUser.uid;
        await deleteDoc(doc(db, "users", userId, "transactions", id));
    } catch (error) {
        console.error("Error deleting transaction: ", error);
    }
}

// Update Transaction
export async function updateTransactionInFirebase(id, updatedData) {
    try {
        if (!currentUser) {
            throw new Error("User is not authenticated");
        }
        const userId = currentUser.uid;
        const transactionRef = doc(db, "users", userId, "transactions", id);
        await updateDoc(transactionRef, updatedData);
    } catch (error) {
        console.error("Error updating transaction: ", error);
    }
}