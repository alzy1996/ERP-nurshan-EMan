import { collection, getDocs, query, where } from "firebase/firestore";
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
