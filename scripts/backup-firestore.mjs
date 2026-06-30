/**
 * Free Firestore backup — reads every document with the Admin SDK and writes a
 * single JSON file. Works on the Spark (no-cost) plan: no managed export, no
 * Cloud Storage bucket. The workflow encrypts the output before storing it.
 *
 * The app stores JSON-native field types (numbers for timestamps, plain
 * lat/lng numbers, strings) — so a plain JSON dump is a faithful copy. If you
 * later introduce Firestore Timestamp/GeoPoint/Reference field types, extend
 * the serializer below.
 *
 * Env:
 *   GOOGLE_APPLICATION_CREDENTIALS  path to the service-account JSON
 *   PROJECT_ID                      Firebase project id
 *   OUT                             output file (default ./firestore-backup.json)
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { writeFileSync } from "node:fs";

const projectId = process.env.PROJECT_ID || "procurement-erp-6e271";
initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

/** Recursively collect every document (including any sub-collections). */
async function dump(colRef, out) {
  const snap = await colRef.get();
  for (const doc of snap.docs) {
    out.push({ path: doc.ref.path, data: doc.data() });
    const subs = await doc.ref.listCollections();
    for (const sub of subs) await dump(sub, out);
  }
}

const documents = [];
for (const root of await db.listCollections()) await dump(root, documents);

const backup = {
  exportedAt: new Date().toISOString(),
  project: projectId,
  documentCount: documents.length,
  documents,
};

const out = process.env.OUT || "firestore-backup.json";
writeFileSync(out, JSON.stringify(backup));
console.log(`Backed up ${documents.length} documents -> ${out}`);
process.exit(0);
