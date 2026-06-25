import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Same Firebase project as the vanilla (/) and Vite (/app) apps.
export const firebaseConfig = {
  apiKey: "AIzaSyD_c66g5arReA_ePgXjg-3Z387q9IbNUcY",
  authDomain: "procurement-erp-6e271.firebaseapp.com",
  projectId: "procurement-erp-6e271",
  storageBucket: "procurement-erp-6e271.firebasestorage.app",
  messagingSenderId: "726316664067",
  appId: "1:726316664067:web:9cfabcbd75487886991536",
  measurementId: "G-ESMR0D8RKK",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/** Derive the Firebase Auth email from a username (matches the vanilla app's rule). */
export function userEmail(u: string): string {
  return u.toLowerCase().replace(/[^a-z0-9._+-]/g, "_") + "@nexus-erp.app";
}

/** SHA-256 hex — used only to verify + migrate legacy (pre-Firebase-Auth) accounts. */
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
