// Import the functions you need from the SDKs you need
import { auth, db } from "./firebaseConfig.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
        const name = document.getElementById("sign-up-name").value;
        const email = document.getElementById("sign-up-email").value;
        const password = document.getElementById("sign-up-password").value;
        try {
            const authCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            await updateProfile(authCredential.user, {
                displayName: name
            });
            const docRef = doc(db, "users", authCredential.user.uid);
            const userProperties = await setDoc(docRef, {
                email: email,
                name: name
            });
            console.log(userProperties);
            M.toast({ html: "Sign up successful!" });
            window.location.href = "/";
            signUpForm.style.display = "none";
            signInForm.style.display = "block";
        } catch (error) {
            M.toast({ html: error.message});
        }
    });
});