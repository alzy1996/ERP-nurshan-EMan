# NEXT.JS MIGRATION — brief + status

> This file combines the **canonical handoff brief** (confirmed requirements, kept intact below)
> with the **current implementation status** of the `next/` app. The brief is the source of truth
> for scope; the status section tracks what is built and what is still pending against it.

## Implementation status (`next/` — branch `claude/confident-ptolemy-mamimf`, PR #4)

Builds clean (Turbopack, 16 routes). Runs against the same Firebase project as `/` and `/app`.
Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui (vendored).

**Built**
- Liquid-glass design system (frosted glass, specular highlights, inner glow, soft shadows) + light/dark.
- 3D landing page with a frosted-Earth WebGL globe (react-three-fiber). Dashboard shell (glass rail + frosted nav panel + Executions card).
- Auth: `/login` (custom username/password vs `nexus_users`, SHA-256, first-run admin bootstrap) + session context + `/dashboard` route guard + site switcher + per-section nav gating (`canSee`).
- Modules ported from the React app in the glass language: Suppliers (extended — incl. contactPerson, cr/crNumber, vatNumber), Projects (= `sites`, extended), Materials (stock bars), Offers (validity + convert-to-PR), Purchase Requests (Kanban), Contracts, Analytics (CSS/SVG charts), Notifications, Settings (admin console), Attendance (check-in/out).

**Pending vs this brief (needs prioritisation)**
- **Static export** (`output: 'export'`) + serve at `/next` + `firebase.json` rewrite + CI build step. The current app is the default Next build, NOT static-exported yet.
- **Auth choice**: built with the React app's custom-hash login. The brief notes vanilla `/` migrated to **Firebase Auth** (recommended) — confirm which the Next app should use.
- **Purchase Orders** from approved PRs: line items, **+5% VAT**, totals, payment terms, delivery period, notes, **PDF print**. (Only PR/Kanban exists; PO generation NOT built.)
- **Services catalog** `{projectId, supplierId, code, name, unit, rate}` + contract file attach.
- **Timesheets**: supplier (worker timeIn/out/hours, noWorkReason), equipment logs (equipmentCode, meterStart/End), internal staff (date/hours/task) with an **HR approval role**.
- **Users** extended with `phone, email, company`.
- **Cloudinary** upload (cloud `dlutxjphq`, preset `nexus_unsigned`) for contracts/files.
- **i18n EN/AR + RTL**; mobile/responsive pass; inline edit/detail views; supplier detail (radar/score); offers→WhatsApp.

### Data models implemented so far (`next/`)
- **Projects = extended Sites** (`nexus_sites`): `{ name, code, client, status: planning|active|on-hold|completed, location, manager, budget, currency: "OMR", startDate, endDate }`.
- **Suppliers** (`nexus_suppliers`): `name, category, website, contactPerson, phone, secondaryPhone, email, address, city, region, country, crNumber, vatNumber, paymentTerms, bankName, bankAccount/IBAN, rating, status, preferred, tags, notes` (+ score/orders/onTime kept for compatibility).

### Dev
```bash
cd next
npm install
npm run dev      # http://localhost:3000
npm run build    # Turbopack production build
```

---

# CANONICAL BRIEF (user-confirmed — source of truth for scope)

> **Before designing any UI, ASK the user for their UI/UX examples — they will provide them. Do not design UI blind.**

## Repo / live
- Repo: `alzy1996/ERP-nurshan-EMan` (formerly `New-ofm-system-fleet-managments`), branch **`main`** is canonical + auto-deploys.
- Live: vanilla app at `/` and React (Vite) app at `/app` on `https://procurement-erp-6e271.web.app`.
- Firebase project: **procurement-erp-6e271**. Cloudinary cloud **dlutxjphq**, unsigned preset **nexus_unsigned**.

## DECISION (user-confirmed)
- **Migrate everything to Next.js** (App Router). Build it in a new **`next/`** folder on a new branch; keep `react/` `/app` + vanilla `/` live until Next.js reaches parity, then cut hosting over.
- Recommend **static export** (`output: 'export'`) so it stays on Firebase Hosting (internal authed app → no SSR/SEO needed). Serve at `/next` first (like `/app`), then make it root at cutover.
- **One codebase going forward** = Next.js. Vanilla + Vite-React become legacy.

## SCOPE (user-confirmed for the new ERP per the Arabic spec)
- **Projects = existing Sites** (نزوى/الجبل الأخضر/مسقط); reuse, no migration. Add per-project pages that open to that project's POs/materials/services.
- **Purchase Requests (PR) → Purchase Order (PO): keep BOTH.** PR = internal multi-level approval (already built, with per-user `approvalLevel` gating). Approved PR → generate a formal **PO**: line items (desc, unit, qty, unitPrice, lineTotal), auto **+5% VAT**, total, payment terms, delivery period, notes, **PDF print** (client-side, e.g. pdfmake/react-pdf).
- **Suppliers**: extend with `contactPerson`, `cr` (commercial registration), `vatNumber` (OM VAT). (Have name/phone/email.)
- **Users**: extend with `phone`, `email`, `company`.
- **Services catalog**: `{projectId, supplierId, code, name, unit, rate}` (each service/equipment has a tracking **code**). Attach contract files (Cloudinary) per supplier/service.
- **Timesheets (add alongside existing GPS Attendance):**
  - Supplier timesheet: worker `timeIn/timeOut/hours`, `noWorkReason`.
  - Equipment logs: `equipmentCode`, `meterStart/meterEnd/hours`, note.
  - Internal staff timesheet: `{userId, date, hours, task, status}` with **HR role** review/approve.

## DATA MODEL (Firestore, all scoped by projectId/siteId)
projects(=nexus_sites) · users(+phone,email,company) · suppliers(+contactPerson,cr,vatNumber) ·
purchase_orders{projectId,supplierId,poNumber,status,paymentTerms,deliveryPeriod,notes,subtotal,vat,total} + po_items[] ·
services{projectId,supplierId,code,name,unit,rate} · contracts(+fileUrl) ·
supplier_timesheets{projectId,supplierId,date,workerName,timeIn,timeOut,hours,noWorkReason} ·
equipment_logs{projectId,supplierId,equipmentCode,date,meterStart,meterEnd,hours,note} ·
internal_timesheets{projectId,userId,date,hours,task,status,approvedByHR}
(Collections currently prefixed `nexus_`.)

## STACK to mirror from the Vite-React app (read `react/src/` as the reference)
- Firebase modular SDK (config in `react/src/lib/firebase.js`); custom username/password login vs `nexus_users` with SHA-256 + anonymous Firebase Auth; site scoping in `react/src/lib/data.js`; Cloudinary upload in `react/src/lib/cloudinary.js`; i18n EN/AR in `react/src/lib/i18n.js`; auth/session/theme/lang/site context in `react/src/context/AppContext.jsx`; app shell (collapsible iOS sidebar) in `react/src/components/Shell.jsx`; pages in `react/src/pages/*` (Login, Dashboard, Suppliers, Contracts+PSI, Attendance+Leaflet, Offers, Materials, PurchaseRequests Kanban, Analytics, Settings, Notifications).
- NOTE: vanilla `/` on `main` migrated to real **Firebase Authentication** (see `nexus-core.js`); decide whether Next.js uses Firebase Auth (recommended) or the custom-hash login the React app uses.

## PHASED PLAN
1. Scaffold Next.js (`next/`, App Router, Tailwind, static export) + port shell/auth/site-context/i18n/Cloudinary. **Pages first: Projects + Suppliers (extended fields).**
2. Purchase Orders (line items + 5% VAT + PDF), linked from approved PRs.
3. Services catalog (codes) + contract file attach.
4. Timesheets (supplier + equipment + internal w/ HR approval) + HR role.
Then: CI build step for `next/` → `/next`, then cut hosting root over.

## DEPLOY
GitHub Action `.github/workflows/firebase-deploy.yml` triggers on push to `main` (and the old branch); it builds `react/` → `./app`. Add a parallel step to build `next/` → `./next` and a `firebase.json` rewrite `/next/** -> /next/index.html`. Secrets: `FIREBASE_TOKEN` (and/or `FIREBASE_SERVICE_ACCOUNT`).
