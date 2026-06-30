# ERP Nexus — Full System Brief

*A complete, self-contained description of the system — written so it can be
pasted into a fresh chat as research context. Last updated by the engineering
work in this repository.*

---

## 1. What it is

**ERP Nexus** is a web-based **procurement & construction ERP** built for **Eman
Works** (an Oman-based construction/contracting company — amounts are in **OMR**,
Omani Rial). It runs all the procurement, project, workforce and supplier
activity of the company in one place, in the browser, on phone/tablet/desktop.

It is a **single-page web app** (no install) that staff open and sign in to. Each
person sees only the parts of the system their job allows.

## 2. Who uses it

People sign in with a username + password (real accounts). What they can see and
do is decided by their **role** (12 roles) plus optional **per-user access
rules** an administrator can set. Typical users: company management, procurement
team, finance, HR, site/project engineers, warehouse/store, inspectors, external
contractors, and a documentation controller.

## 3. Technology (for context)

- **Frontend:** Next.js (App Router) exported as a **static site**; React; a
  "liquid-glass" UI built with Tailwind CSS + shadcn/ui; a three.js globe on the
  landing page; **Leaflet + OpenStreetMap** for maps (no map API key).
- **Backend / data:** **Google Firebase** — **Email/Password Authentication**,
  **Cloud Firestore** (the database), and **Firebase Hosting** (serving the site).
  There is **no custom server** — the browser talks to Firestore directly, and
  **Firestore security rules** are the server-side guard.
- **Languages:** English, Arabic, Turkish, Persian — with **right-to-left** layout
  for Arabic & Persian.
- **Two apps in the repo:** the **Next.js app** (the current system, served at the
  site root) and an older **React app** (served at `/app`, legacy). The Next app
  is the live system.
- **Hosting/CI:** GitHub + GitHub Actions. Pushing to `main` auto-deploys to
  Firebase, but only **after** an automated test gate passes (see §8).

## 4. Modules (sections)

| Module | What it does |
|---|---|
| **Dashboard** | Landing screen after sign-in: quick counts (requests, suppliers, materials, projects, offers) and shortcuts. |
| **Suppliers** | Company vendor directory (contact, category, rating, status). The "spine" referenced by other screens. |
| **Materials** | Catalogue of materials (price, stock, reorder level), each linked to a supplier. |
| **Services** | Bought services, each linked to a supplier. |
| **Offers** | Price offers from suppliers; can also be submitted by suppliers via a public token link. |
| **Purchase Requests (PR)** | Internal "we need this" requests; a Kanban board with stages **Submitted → Approved → Ordered → Received / Rejected**. Items can be picked from the Materials catalogue. |
| **Purchase Orders (PO)** | Official orders to a supplier with line items, **5% VAT**, totals, and a printable PDF. Can be created from an approved PR. |
| **Contracts** | Store/manage contracts; share a secure link for **e-signature**. |
| **Projects** | The company's sites/projects. People are assigned to the sites they work on (this drives data scoping). |
| **Inspections** | QA/inspection records. *(Defined in the access model but the screen is not built yet.)* |
| **Attendance** | One-tap check-in / check-out, optionally **geofenced** — a person must be within a set distance (up to **500 m**) of an assigned location to check in. |
| **Timesheets** | Worker hours against a contract — separate tabs for supplier labour, equipment, and internal staff. |
| **Analytics** | Key numbers and trends. |
| **Notifications** | Recent activity and alerts (visible to everyone). |
| **Users** | Admin-only: create users, set role, assign sites, suspend, and set per-user custom access. |
| **Settings** | Admin/configuration. |

## 5. Roles & access control

The single source of truth for roles is `next/src/lib/roles.ts`. It defines **12
roles** × **16 modules** × capabilities (**read / create / update / delete /
approve**) and a **scope** (all / own project / own records / none).

**Roles:** Super Admin, Management, **Country Manager** (country-wide oversight +
approvals), Procurement Manager, Buyer / Procurement Officer, Finance / Accounts,
HR, Site / Project Engineer, Warehouse / Store, Inspector (QA), Contractor
(external), **Documentation Controller** (raises material requests; procurement
approves).

**Two layers of gating:**
1. **Role matrix** — what each role can see/do (drives the menu, the routes, and
   the action buttons).
2. **Per-user overrides** — an admin can **Allow** a section a role normally
   hides, or **Deny** a section a role normally has, per individual user. (Deny
   always wins; admins are never restricted.)

**Site scoping:** most records carry a `siteId`; non-admins only see data for
their assigned site(s); the active site is chosen from a top-bar switcher.

**Server enforcement:** Firestore rules verify the user is really signed in, that
"administrator" is genuine (read from the server profile, can't be faked), and
that the user belongs to the record's site. *(Per-user/role section enforcement
at the database layer is a planned hardening step — see §9.)*

## 6. Core workflows

- **Procure-to-Pay (the main loop, partially built):**
  `Offer → Purchase Request (need) → Approval → Purchase Order (to supplier) →
  (Goods Receipt) → (Inspection) → (Invoice) → (Payment)`.
  Today: PRs are raised (with a Materials pick + a required site), approved by
  procurement/management/finance/country-manager, and an **approved PR can be
  turned into a PO** (the PO links back to the PR and the PR moves to "Ordered").
  Goods Receipt, Invoices and Payments are **not built yet**.
- **Attendance:** an admin/HR sets a check-in location on a map for a person;
  that person checks in only when physically within the allowed radius.
- **Offers intake:** staff record offers, or suppliers submit them through a
  public tokened link (validated, anonymous, fixed shape).
- **Contracts:** stored and shareable for e-signature.

## 7. Data model (high level)

Firestore collections are prefixed `nexus_` — e.g. `nexus_users`, `nexus_prs`
(purchase requests), `nexus_purchase_orders`, `nexus_suppliers`,
`nexus_materials`, `nexus_services`, `nexus_offers`, `nexus_contracts`,
`nexus_sites` (projects), `nexus_attendance`, `nexus_geofences`,
`nexus_supplier_timesheets` / `nexus_internal_timesheets` / `nexus_equipment_logs`,
`nexus_psi` (inspections), `nexus_notifications`, `nexus_activity`,
`nexus_settings`, `nexus_meta`.

Every record stores **audit fields** (`createdBy`, `updatedBy`, `createdAt`,
`updatedAt`) and a `siteId` for scoping. Documents are beginning to **link**
(e.g. a PO stores `fromPrId`; a PR stores its `poId` and `materialId`). A
fuller "document chain" (PR→PO→GRN→Invoice→Payment) with numbers and status
propagation is the main roadmap item.

## 8. Security & operations

- **Auth:** real Firebase Email/Password; server-verified admin.
- **Database rules:** deny-by-default; site + auth enforced.
- **Pre-deploy gate (CI):** every change must pass — build the Next app, build
  the React app, and run **Firestore security-rule tests** — before it can reach
  `main` and auto-deploy.
- **Vulnerability scanning:** **CodeQL** (code) + **npm audit** (dependencies) on
  every change and weekly.
- **Hardened web responses:** security headers (clickjacking, content-type,
  HTTPS enforcement).
- **Backups:** a **free, encrypted daily backup** of the whole database (no paid
  plan) stored as an artifact.
- **Dependencies:** Dependabot proposes updates automatically.
- **Deploy:** auto-deploy to Firebase Hosting on merge to `main`.

## 9. Current state & roadmap

**Live today:** auth + roles + per-user access, the modules in §4 (except
Inspections), PR approval, PR→PO creation, attendance geofencing, multi-language
UI, the CI gate, scanning, headers, and the free backup.

**Planned (roadmap):**
- **Phase 1 — close the core loop:** Goods Receipt, finish Inspections, document
  numbers, full status propagation PR→PO→GRN→Invoice.
- **Phase 2 — visibility:** an **audit/activity log** (every user action, search
  by date/PO/PR/supplier/user) and a **shared filter/search bar** on every list.
- **Phase 3 — money:** Supplier Invoices (AP), 3-way match, Payments, Budgets.
- **Phase 4 — CRM:** Customers, Leads, Opportunities, Quotations, Sales Orders,
  customer Invoices (AR), Receipts, + Sales/Account-Manager roles.
- **Phase 5 — hardening:** per-user/role enforcement in the database rules,
  approval thresholds by value, App Check, Point-in-Time Recovery, admin 2FA.

**Missing roles to consider:** Auditor (read-only), Project Manager, AP/AR clerk,
Sales / Account Manager.

---

*Companion documents in this repo: `ERP-NEXUS-OVERVIEW.md` (system overview) and
`ERP-NEXUS-DESIGN-REVIEW.md` (the detailed gap analysis & roadmap). Source of
truth for roles is `next/src/lib/roles.ts`; for security it is `firestore.rules`.*
