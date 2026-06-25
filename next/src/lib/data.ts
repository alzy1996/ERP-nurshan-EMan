import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

const ALL = "__ALL__";

export type Session = {
  username?: string;
  activeSite?: string;
  isAdmin?: boolean;
} | null;

/** Fetch a collection scoped to the active site (all docs for admin "All sites"). */
export async function fetchScoped<T = Record<string, unknown>>(
  shortName: string,
  session: Session
): Promise<(T & { id: string })[]> {
  const col = collection(db, "nexus_" + shortName);
  const active = session ? session.activeSite || ALL : ALL;
  const q =
    session && session.isAdmin && active === ALL
      ? col
      : query(col, where("siteId", "==", active));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

/** Add a doc stamped with siteId/author/timestamp. */
export function addScoped(
  shortName: string,
  data: Record<string, unknown>,
  session: Session,
  siteId?: string | null
) {
  return addDoc(collection(db, "nexus_" + shortName), {
    ...data,
    siteId: data.siteId || siteId || null,
    createdBy: (session && session.username) || "system",
    createdAt: Date.now(),
  });
}

/** Delete a doc by id. */
export function removeScoped(shortName: string, id: string) {
  return deleteDoc(doc(db, "nexus_" + shortName, id));
}

/** Bulk-delete every doc in a collection for the active site (admin). Returns count. */
export async function wipeCollection(shortName: string, session: Session): Promise<number> {
  const docs = await fetchScoped(shortName, session);
  if (!docs.length) return 0;
  const batch = writeBatch(db);
  docs.forEach((d) => batch.delete(doc(db, "nexus_" + shortName, d.id)));
  await batch.commit();
  return docs.length;
}

/** Write a WhatsApp token to Firestore, THEN open wa.me after 500ms (token-first rule). */
export async function sendWhatsApp(
  number: string,
  message: string,
  record?: Record<string, unknown>
) {
  if (record) {
    await addDoc(collection(db, "nexus_whatsapp_tokens"), { ...record, message, at: Date.now() });
  }
  const url =
    "https://wa.me/" + String(number).replace(/\D/g, "") + "?text=" + encodeURIComponent(message);
  setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 500);
}
