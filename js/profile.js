import {
    auth,
    db
} from "./firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js"

document.addEventListener("DOMContentLoaded", () => {
    const userNameElement = document.getElementById("user-name");
    const userEmailElement = document.getElementById("user-email");

    // Listen for authentication state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) { // User is authenticated, get user details
            const userId = user.uid;
            try {
                // Reference to the user's document in Firestore
                const userRef = doc(db, "users", userId);
                const userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                    // Update the profile HTML with user details
                    const userData = userDoc.data();
                    userNameElement.textContent = userData.name || "Anonymous";
                    userEmailElement.textContent = userData.email;
                } else {
                    console.error("No user document found!");
                }
            } catch (error) {
                console.error("Error fetching user details: ", error);
            }
        } else { // No user is authenticated, redirect to the login page
            window.location.href = "/pages/auth.html";
        }
    });
});