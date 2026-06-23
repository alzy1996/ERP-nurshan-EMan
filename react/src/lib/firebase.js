import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD_c66g5arReA_ePgXjg-3Z387q9IbNUcY",
  authDomain: "procurement-erp-6e271.firebaseapp.com",
  projectId: "procurement-erp-6e271",
  storageBucket: "procurement-erp-6e271.firebasestorage.app",
  messagingSenderId: "726316664067",
  appId: "1:726316664067:web:9cfabcbd75487886991536",
  measurementId: "G-ESMR0D8RKK"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const authReady = signInAnonymously(auth).catch((e) => console.warn("anon auth", e));

/** SHA-256 hex (matches the vanilla app's password hashing). */
export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
