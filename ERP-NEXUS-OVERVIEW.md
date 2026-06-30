# ERP Nexus — System Overview

A procurement & construction ERP for **Eman Works**, rebuilt as a modern
Next.js app with a liquid‑glass UI, real Firebase authentication, role‑based
access control, multi‑language support, and geofenced attendance.

- **Live app:** `https://procurement-erp-6e271.web.app/` (the bare domain is the
  new app; `…firebaseapp.com` is the same site)
- **Legacy React app:** `/app` &nbsp;•&nbsp; **Public pages:** `/offer-submit.html`, `/contract-sign.html`
- **Old `/nx` links** auto‑redirect to `/`

---

## 1. UI / UX

**Design language — “liquid glass”.** Frosted glass panels with specular
highlights, soft multi‑colour gradients, generous rounding (`rounded-3xl`), and
a calm, airy layout. Built with **Tailwind CSS** + **shadcn/ui** components and
**lucide** icons.

| Area | Details |
|---|---|
| **Landing page** (`/`) | Marketing hero with an interactive **3D globe** (three.js), feature cards, and **Sign in** / **Open app** actions |
| **Sidebar** | A dark rounded **rail** (icon nav + account menu + language/theme/settings) plus a frosted **label panel** that **folds/unfolds** and is **folded by default** (remembered per device) |
| **Navigation** | Driven by the user’s **role** — only permitted modules appear (deny‑by‑default), grouped Workspace / Insights / Admin |
| **Theme** | Light theme by default with a **theme toggle** (`next-themes`) |
| **Languages** | **English, Arabic, Turkish, Persian/Farsi**, with full **RTL** layout for Arabic & Persian. Switchable from the rail |
| **Feedback** | Toast notifications (`sonner`), inline loading spinners, graceful empty states |
| **Background** | A shared glowing “orb” + soft gradient field across login and dashboard for a consistent look |

---

## 2. Authentication

Real **Firebase Email/Password** auth (not a custom hash) — required by the
Firestore security rules.

- **Login:** users sign in with a **username + password**. The username maps to
  an email internally (`username → username@nexus-erp.app`).
- **Legacy migration:** old SHA‑256 accounts are **auto‑migrated** to Firebase
  Auth on their first successful login (transparent to the user).
- **First‑run bootstrap:** if no users exist, the login screen offers
  **“Create administrator”** to set up the first full‑access account.
- **Admin user creation** happens via a **secondary Firebase app**, so creating
  a user never logs the admin out.
- **Session** is driven by Firebase `onAuthStateChanged` (persisted by Firebase)
  plus a cached profile; **Sign out** clears both.

---

## 3. Roles & Permissions (RBAC)

The single source of truth is **`next/src/lib/roles.ts`**. Access is bound to the
logged‑in user’s **role** via the `usePermissions()` hook, which gates the
**sidebar**, **routes**, and **action buttons** (create / edit / delete /
approve).

### Roles

| Role key | Label |
|---|---|
| `admin` | Super Admin |
| `management` | Management |
| `procurement_manager` | Procurement Manager |
| `buyer` | Buyer / Procurement Officer |
| `finance` | Finance / Accounts |
| `hr` | HR |
| `site_engineer` | Site / Project Engineer |
| `warehouse` | Warehouse / Store |
| `inspector` | Inspector (QA / PSI) |
| `contractor` | Contractor (external) |

### Capabilities & scope

- **Capabilities:** `read`, `create`, `update`, `delete`, `approve`
- **Scope:** `all` (everything), `project` (their assigned site/project),
  `own` (only records they created), or `none`
- **Baseline:** every role can always see **Dashboard** and **Notifications**

### What each role can do (summary)

| Role | Highlights |
|---|---|
| **Super Admin** | Full access to every module (god mode) |
| **Management** | View everything; **approve** Purchase Requests & Purchase Orders |
| **Procurement Manager** | Full on Suppliers, Materials, Services, Offers, PRs, POs, Contracts; view Projects/Inspections/Attendance/Analytics |
| **Buyer / Procurement Officer** | Edit Suppliers, Services, Offers, PRs, POs; view Materials/Contracts/Projects; own Attendance & Timesheets |
| **Finance / Accounts** | View + **approve** PRs, POs, Contracts; view Suppliers/Materials/Services/Projects/Analytics |
| **HR** | Full **Attendance & Timesheets**; view Projects & Analytics; **can set check‑in locations** |
| **Site / Project Engineer** | PRs & Projects edit **for their project**; own Attendance/Timesheets; view Suppliers/Materials/Services/POs/Contracts/Inspections |
| **Warehouse / Store** | Full **Materials**; view Suppliers/Services/Projects/Inspections; own Attendance/Timesheets |
| **Inspector (QA/PSI)** | Full **Inspections**; view procurement data; own Attendance/Timesheets |
| **Contractor (external)** | **Own** Contracts & Projects; own Attendance/Timesheets |

### Managing users — `/dashboard/users` (admin)

- **Add user** — name, username, password, **role**, and optional **sites**
  (creates a real Firebase Auth account).
- **Change role** — per‑user dropdown (`ROLE_LABELS`).
- **Assign sites** — the **📍 button** sets which construction site(s) a user
  can see (for site‑scoped roles).
- **Suspend / reactivate** — the **Ban** button (user docs can’t be deleted by
  rule; suspension is used instead).

---

## 4. Modules

| Module | Route | Notes |
|---|---|---|
| **Dashboard** | `/dashboard` | Real counts — Purchase Requests, Suppliers, Materials, Projects, Offers |
| **Suppliers** | `/dashboard/suppliers` | Vendor directory (company‑wide master data) |
| **Materials** | `/dashboard/materials` | Pricing & stock; **Supplier** picked from a dropdown |
| **Services** | `/dashboard/services` | **Supplier** dropdown |
| **Offers** | `/dashboard/offers` | Supplier offers; convert to a Purchase Request |
| **Purchase Requests** | `/dashboard/purchase-requests` | Requests & approval flow |
| **Purchase Orders** | `/dashboard/purchase-orders` | VAT + PDF; **Supplier** dropdown |
| **Contracts** | `/dashboard/contracts` | **Supplier** dropdown; public signing page |
| **Projects** | `/dashboard/projects` | Sites / projects |
| **Attendance** | `/dashboard/attendance` | **Geofenced check‑in** (see §5) |
| **Timesheets** | `/dashboard/timesheets` | Supplier (→ **Contract** dropdown), Equipment, and Internal logs |
| **Analytics** | `/dashboard/analytics` | KPIs & charts |
| **Notifications** | `/dashboard/notifications` | Activity & alerts |
| **Users** | `/dashboard/users` | Admin: roles, sites, suspend, add users |
| **Settings** | `/dashboard/settings` | Profile, theme, language, sites list |

**Supplier / contract links.** Materials, Services, Purchase Orders and
Contracts pick their **Supplier** from your existing suppliers (a dropdown, not
free text). Timesheets are linked to a **Contract** — and since each contract is
linked to a supplier, you get **timesheet → contract → supplier**.

---

## 5. Geofenced Attendance

Per‑user check‑in locations enforced by GPS.

- **Admin / HR** open **Attendance → “Check‑in locations”**, pick a user, and set
  a location on a **map** (Leaflet + OpenStreetMap — no API key) plus an allowed
  **radius (≤ 500 m)**. “Use my current location” and a radius slider are
  provided.
- On **check‑in / out**, the app reads the device GPS and **blocks** the punch if
  the user is outside the radius (showing how far away they are), and stamps the
  coordinates on the record.
- Locations live in the `nexus_geofences` collection (one doc per user). Clearing
  a location lets that user check in anywhere again.

---

## 6. Data Model & Security

**Firestore**, collections prefixed `nexus_`.

- **Master data (company‑wide):** `nexus_suppliers`, `nexus_materials` — shared
  across all sites so the supplier dropdowns work everywhere.
- **Operational data:** `nexus_prs`, `nexus_purchase_orders`, `nexus_services`,
  `nexus_contracts`, `nexus_supplier_timesheets`, `nexus_equipment_logs`,
  `nexus_internal_timesheets`, `nexus_attendance`, `nexus_sites` (projects), …
- **Audit fields** on every write: `createdBy`, `updatedBy` (the user’s uid),
  `createdAt`, `updatedAt`.
- **Geofences:** `nexus_geofences` (doc id = user uid).
- **Site scoping:** non‑admins are scoped to their **assigned site(s)** for
  site‑based collections; admins on “All sites” see everything.

**Security rules** (`firestore.rules`):

- Require **real Firebase password auth** (`isPasswordAuth()`); a forged
  `localStorage` admin flag can’t bypass them (admin is checked server‑side via
  the user’s profile).
- Geofences are writable only by **admin or HR**.
- User documents can’t be deleted from the client (suspension is used).

---

## 7. Hosting & Deployment

- **Firebase Hosting**, project **`procurement-erp-6e271`** (two default domains:
  `…web.app` and `…firebaseapp.com`).
- **Root `/`** serves the new Next.js app (static export). **`/app`** serves the
  legacy React app. **`/offer-submit.html`** and **`/contract-sign.html`** are
  public submission pages.
- **`/nx` → `/`** (301 redirect) for old bookmarks.
- The old vanilla ERP pages were retired and its **service worker neutralised**
  (clears cache + unregisters) so returning devices load the new app.
- **CI/CD:** GitHub Actions (`.github/workflows/firebase-deploy.yml`) builds the
  React + Next apps and deploys **Hosting + Firestore rules** on every push to
  `main`.

---

## 8. Admin Quick‑Start

1. **Sign in** at `/` with your admin username & password (first run offers
   “Create administrator”).
2. **Add a site/project** so site‑scoped data has somewhere to live.
3. **Create users** at `/dashboard/users` → set each one’s **role** and **site(s)**.
4. **Set check‑in locations** at **Attendance → Check‑in locations** (map +
   radius) for staff who must clock in on site.
5. **Add suppliers**, then create **materials / services / POs / contracts** —
   the supplier picker is populated from that list.

---

## 9. Tech Stack

- **Next.js (App Router)** static export · **React** · **TypeScript**
- **Tailwind CSS** + **shadcn/ui** · **lucide** icons · **three.js** (globe) ·
  **Leaflet/OpenStreetMap** (maps) · **sonner** (toasts)
- **Firebase** Authentication + Firestore + Hosting
- **GitHub Actions** CI/CD

---

*This document reflects the system as deployed. Source of truth for permissions
is `next/src/lib/roles.ts`; for security it’s `firestore.rules`.*
