import type { Session } from "./data";

// TEMPORARY: login/auth + AppContext aren't ported to the Next app yet (that's a
// later migration step). Screens use this permissive demo session so list/add
// work against the shared Firestore — reads all sites (admin), writes unscoped.
// Replace with the real session once login + site scoping are ported.
export const demoSession: Session = {
  isAdmin: true,
  activeSite: "__ALL__",
  username: "demo",
};
