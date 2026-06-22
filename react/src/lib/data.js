import { collection, getDocs, query, where, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

const ALL = "__ALL__";

/** Fetch a collection scoped to the active site (all docs for admin "All sites"). */
export async function fetchScoped(shortName, session) {
  const col = collection(db, "nexus_" + shortName);
  const active = session ? session.activeSite || ALL : ALL;
  const q = session && session.isAdmin && active === ALL ? col : query(col, where("siteId", "==", active));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Add a doc stamped with siteId/author/timestamp. */
export function addScoped(shortName, data, session, siteId) {
  return addDoc(collection(db, "nexus_" + shortName), {
    ...data,
    siteId: data.siteId || siteId || null,
    createdBy: (session && session.username) || "system",
    createdAt: Date.now()
  });
}

/** Delete a doc by id. */
export function removeScoped(shortName, id) {
  return deleteDoc(doc(db, "nexus_" + shortName, id));
}

/** Write a WhatsApp token to Firestore, THEN open wa.me after 500ms (token-first rule). */
export async function sendWhatsApp(number, message, record) {
  if (record) await addDoc(collection(db, "nexus_whatsapp_tokens"), { ...record, message, at: Date.now() });
  const url = "https://wa.me/" + String(number).replace(/\D/g, "") + "?text=" + encodeURIComponent(message);
  setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 500);
}
