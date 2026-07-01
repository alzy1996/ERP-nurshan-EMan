import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { scopeFor, type ModuleKey, type Role } from "./roles";

const ALL = "__ALL__";

export type Session = {
  username?: string;
  uid?: string;
  role?: Role | null;
  activeSite?: string;
  sites?: string[];
  isAdmin?: boolean;
} | null;

/** Map a data-layer short name to its RBAC module key (for scope resolution). */
const SHORT_TO_MODULE: Record<string, ModuleKey> = {
  suppliers: "suppliers",
  materials: "materials",
  inventory: "inventory",
  material_usage: "material_usage",
  offers: "offers",
  prs: "purchase_requests",
  pos: "purchase_orders",
  purchaseorders: "purchase_orders",
  deliveries: "deliveries",
  contracts: "contracts",
  sites: "projects",
  projects: "projects",
  site_logs: "site_logs",
  safety: "safety",
  messages: "messages",
  workforce: "workforce",
  equipment: "equipment",
  attendance: "attendance",
};

/** Collections that are company-wide master data (never site-filtered). */
const GLOBAL_COLLECTIONS = new Set(["suppliers", "materials"]);

/** Current actor's stable id for audit stamps (uid preferred, username fallback). */
function actor(session: Session): string {
  return (session && (session.uid || session.username)) || "system";
}

/**
 * Fetch a collection, scoped for the current user:
 *  • admin + "All sites"      → everything
 *  • RBAC scope "own"         → only docs they created (createdBy == uid)
 *  • otherwise                → the active site (site / project scope)
 */
export async function fetchScoped<T = Record<string, unknown>>(
  shortName: string,
  session: Session
): Promise<(T & { id: string })[]> {
  const col = collection(db, "nexus_" + shortName);

  // Company-wide master data (suppliers, materials) — return all, no site filter.
  if (GLOBAL_COLLECTIONS.has(shortName)) {
    const snap = await getDocs(col);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
  }

  const active = session ? session.activeSite || ALL : ALL;
  const isAdmin = !!(session && session.isAdmin);
  const moduleKey = SHORT_TO_MODULE[shortName];
  const scope = moduleKey && session?.role ? scopeFor(session.role, moduleKey) : "all";

  let q;
  if (isAdmin && active === ALL) {
    q = col;
  } else if (scope === "own" && session?.uid) {
    q = query(col, where("createdBy", "==", session.uid));
  } else if (!active || active === ALL) {
    // Non-admin with no site assigned yet → nothing site-scoped to show (avoids
    // a rejected "siteId == __ALL__" query that would surface as "can't load").
    return [];
  } else {
    q = query(col, where("siteId", "==", active));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

/** Add a doc, stamped with siteId + full audit fields (createdBy/updatedBy/timestamps). */
export function addScoped(
  shortName: string,
  data: Record<string, unknown>,
  session: Session,
  siteId?: string | null
) {
  const uid = actor(session);
  const now = Date.now();
  return addDoc(collection(db, "nexus_" + shortName), {
    ...data,
    siteId: data.siteId || siteId || null,
    createdBy: uid,
    updatedBy: uid,
    createdAt: now,
    updatedAt: now,
  });
}

/** Update a doc, stamping updatedBy/updatedAt (audit fields for the security rules). */
export function updateScoped(
  shortName: string,
  id: string,
  data: Record<string, unknown>,
  session: Session
) {
  return updateDoc(doc(db, "nexus_" + shortName, id), {
    ...data,
    updatedBy: actor(session),
    updatedAt: Date.now(),
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
