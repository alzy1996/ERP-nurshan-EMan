import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// Same Firebase project as the vanilla (/) and Vite (/app) apps, so all three
// run against one backend during the migration.
const firebaseConfig = {
  apiKey: "AIzaSyD_c66g5arReA_ePgXjg-3Z387q9IbNUcY",
  authDomain: "procurement-erp-6e271.firebaseapp.com",
  projectId: "procurement-erp-6e271",
  storageBucket: "procurement-erp-6e271.firebasestorage.app",
  messagingSenderId: "726316664067",
  appId: "1:726316664067:web:9cfabcbd75487886991536",
  measurementId: "G-ESMR0D8RKK",
};

// getApps() guard avoids re-initialising across HMR / RSC boundaries.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

let anonPromise: Promise<unknown> | null = null;

/** Sign in anonymously, once, on the client only. Safe to call repeatedly. */
export function ensureAnonAuth(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!anonPromise) {
    anonPromise = signInAnonymously(auth).catch((e) => {
      console.warn("anon auth", e);
    });
  }
  return anonPromise;
}

/** SHA-256 hex — matches the vanilla app's password hashing. */
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
