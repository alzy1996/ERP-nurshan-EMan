/**
 * Firestore security-rule tests.
 *
 * These prove the most important security invariants hold — e.g. that an
 * outsider (not signed in) and a non-password session cannot read or write your
 * data. They run against the Firestore emulator in CI, so a future change to
 * firestore.rules that accidentally opens the database will FAIL the check
 * before it can reach production.
 *
 * Run locally:  firebase emulators:exec --only firestore --project demo-erp-nexus "cd firestore-tests && npm test"
 */
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let failures = 0;
async function check(name, promise) {
  try {
    await promise;
    console.log("  ✓ " + name);
  } catch (e) {
    failures++;
    console.error("  ✗ " + name + " — " + (e && e.message ? e.message : e));
  }
}

const testEnv = await initializeTestEnvironment({
  projectId: "demo-erp-nexus",
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
});

// An outsider with no account at all.
const anon = testEnv.unauthenticatedContext().firestore();
// Signed in, but NOT via email/password (e.g. anonymous / custom) — the rules
// require real password auth for app data, so this must still be blocked.
const nonPassword = testEnv.authenticatedContext("intruder-1").firestore();

console.log("Firestore security rules — invariants:");

// 1. Outsiders cannot READ protected data.
await check("unauthenticated CANNOT read suppliers",
  assertFails(getDoc(doc(anon, "nexus_suppliers/x"))));
await check("unauthenticated CANNOT read purchase requests",
  assertFails(getDoc(doc(anon, "nexus_prs/x"))));
await check("unauthenticated CANNOT read attendance",
  assertFails(getDoc(doc(anon, "nexus_attendance/x"))));

// 2. Outsiders cannot WRITE.
await check("unauthenticated CANNOT write a supplier",
  assertFails(setDoc(doc(anon, "nexus_suppliers/x"), { name: "x" })));

// 3. A signed-in but non-password session is still blocked from app data.
await check("non-password user CANNOT read purchase requests",
  assertFails(getDoc(doc(nonPassword, "nexus_prs/x"))));
await check("non-password user CANNOT write a contract",
  assertFails(setDoc(doc(nonPassword, "nexus_contracts/x"), { title: "x" })));

// 4. Unknown collections are denied by the catch-all.
await check("an unknown collection is denied",
  assertFails(getDoc(doc(anon, "totally_secret/x"))));

// 5. The intended public bit (first-run check) IS readable — sanity check.
await check("bootstrap status IS publicly readable (by design)",
  assertSucceeds(getDoc(doc(anon, "nexus_meta/bootstrap_status"))));

await testEnv.cleanup();

if (failures) {
  console.error("\n" + failures + " rule invariant(s) FAILED");
  process.exit(1);
}
console.log("\nAll security-rule invariants hold ✔");
process.exit(0);
