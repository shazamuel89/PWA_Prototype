import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD89_R4P0IqKnNct05I9n_udz-iF3WHYY8",
    authDomain: "budgettracker-b8d7c.firebaseapp.com",
    projectId: "budgettracker-b8d7c",
    storageBucket: "budgettracker-b8d7c.firebasestorage.app",
    messagingSenderId: "1055163160411",
    appId: "1:1055163160411:web:60a82d7c4804e492f62c7e",
    measurementId: "G-GKTE617NSD"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };