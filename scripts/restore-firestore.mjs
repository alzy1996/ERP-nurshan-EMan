/**
 * Restore a Firestore backup produced by backup-firestore.mjs.
 *
 * DESTRUCTIVE: overwrites documents at the same paths. Guarded — it refuses to
 * run unless CONFIRM=yes is set, so it can't fire by accident.
 *
 * Usage:
 *   1. Decrypt the artifact:
 *        gpg --batch --passphrase "<BACKUP_PASSPHRASE>" \
 *            -o firestore-backup.json -d firestore-backup-<stamp>.json.gpg
 *   2. Restore:
 *        cd scripts && npm install
 *        GOOGLE_APPLICATION_CREDENTIALS=<sa.json> PROJECT_ID=procurement-erp-6e271 \
 *          IN=../firestore-backup.json CONFIRM=yes node restore-firestore.mjs
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

if (process.env.CONFIRM !== "yes") {
  console.error("Refusing to restore without CONFIRM=yes (this overwrites live data).");
  process.exit(1);
}

const projectId = process.env.PROJECT_ID || "procurement-erp-6e271";
initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

const file = process.env.IN || "firestore-backup.json";
const backup = JSON.parse(readFileSync(file, "utf8"));
console.log(`Restoring ${backup.documents.length} documents (exported ${backup.exportedAt}) into ${projectId}`);

let n = 0;
let batch = db.batch();
for (const { path, data } of backup.documents) {
  batch.set(db.doc(path), data);
  if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
}
await batch.commit();
console.log(`Restored ${n} documents.`);
process.exit(0);
