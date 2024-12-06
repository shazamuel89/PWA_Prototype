// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// This web app's Firebase configuration
import { firebaseConfig } from "./firebaseConfig.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
    const signInForm = document.getElementById("sign-in-form");
    const signUpForm = document.getElementById("sign-up-form");
    const showSignUp = document.getElementById("show-signup");
    const showSignIn = document.getElementById("show-signin");
    const signInBtn = document.getElementById("sign-in-btn");
    const signUpBtn = document.getElementById("sign-up-btn");
    console.log(signInBtn);

    showSignIn.addEventListener("click", () => {
        signUpForm.style.display = "none";
        signInForm.style.display = "block";
    });

    showSignUp.addEventListener("click", () => {
        signInForm.style.display = "none";
        signUpForm.style.display = "block";
    });

    signInBtn.addEventListener("click", async () => {
        const email = document.getElementById("sign-in-email").value;
        const password = document.getElementById("sign-in-password").value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            M.toast({ html: "Sign-in successful!" });
            window.location.href = "/"; // Redirect to home page after successful sign-in
        } catch (error) {
            console.error("Sign-in error: ", error);
            M.toast({ html: error.message });
        }
    });

    signUpBtn.addEventListener("click", async () => {
        const email = document.getElementById("sign-up-email").value;
        const password = document.getElementById("sign-up-password").value;
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            M.toast({ html: "Sign up successful!" });
            window.location.href = "/";
            signUpForm.style.display = "none";
            signInForm.style.display = "block";
        } catch (error) {
            M.toast({ html: error.message});
        }
    });
});