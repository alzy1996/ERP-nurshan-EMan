# ERP Nexus — Senior ERP/CRM Design Review

*A working assessment of the current system, the gaps to a full closed‑loop
ERP/CRM, and a phased plan to get there. Written as if I owned this product.*

---

## 1. Verdict (one paragraph)

What exists today is a **solid, well‑built procurement front‑end** with real
auth, clean role gating, audit *stamps* on every record, and a deploy/test
safety gate. But as an **ERP/CRM it is not yet a closed loop**: the documents
(Request → Order → Contract) live side‑by‑side but **don't link into a chain**,
there is **no receiving, invoicing or payment**, there is **no CRM (customers /
sales) side at all**, the **audit trail is per‑record only** (no "who did what,
when" activity log), and **search/filtering is basic** (single text box, no date
ranges, no cross‑document lookup). The fix is not a rewrite — it's **wiring the
existing pieces into a flow, adding the missing documents, and adding three
cross‑cutting capabilities: linking, audit log, and a shared filter bar.**

---

## 2. Roles — do they make sense?

**Current roles (12):** `admin`, `management`, `country_manager`,
`procurement_manager`, `buyer`, `finance`, `hr`, `site_engineer`, `warehouse`,
`inspector`, `contractor`, `documentation_controller`.

**Mostly logical**, with these issues:

| Issue | Detail | Recommendation |
|---|---|---|
| `management` ≈ `country_manager` | Both are "view all + approve". With no country dimension they're functionally identical. | Add a **country** field so `country_manager` is scoped to one country; keep `management` global. |
| No pure **read‑only / auditor** | Compliance or an external reviewer needs read‑everything, write‑nothing. | Add **`auditor`** (read all, no create/update/delete/approve). |
| No **Project Manager** | `site_engineer` is project‑scoped editing; `procurement_manager` is procurement. Nobody *owns a project's budget & approvals*. | Add **`project_manager`** (approve within their project, view costs). |
| No **AP/AR clerk** | `finance` approves, but nobody is modelled to enter **supplier invoices** or **customer receipts**. | Add **`accounts_clerk`** when invoicing lands. |
| **CRM roles entirely missing** | No one owns customers, leads, quotes. | Add **`sales`** and **`account_manager`** (CRM phase). |
| **Approval thresholds** absent | Approve is all‑or‑nothing; a buyer's 5 OMR and a 50,000 OMR PR take the same path. | Add **value thresholds** (auto‑route high value to higher roles). |

**Net:** the *operational* roles are good. The gaps are **oversight scoping
(country), read‑only audit, project ownership, and the whole CRM/finance‑clerk
layer.**

---

## 3. Sections — what's built, what's linked, what's missing

**Built & working:** Dashboard, Suppliers, Materials, Services, Offers, Purchase
Requests, Purchase Orders, Contracts, Projects, Attendance, Timesheets,
Analytics, Notifications, Users, Settings.

**Defined but not built:** **Inspections** — it's in the role matrix and routing
(`/dashboard/inspections`) but has **no page**. It's a phantom module: either
build it (it's needed for the receiving/QA step) or remove it.

**Linking gaps (the important part).** Today each document is an island:

| Document | Should link to | Today |
|---|---|---|
| Offer | → the Supplier; → the PR it becomes | Stores a name, not an id chain |
| Purchase Request | → Supplier, Project, and the **PO** it turns into | Free‑text only; no PO link |
| Purchase Order | → its **PR**, Supplier, and the **goods receipt** | Not linked to its PR |
| Contract | → Supplier, Project | Partially |
| Timesheet | → Contract → Supplier | Link exists (good) |

**Missing sections for a closed‑loop ERP:**
- **Goods Receipt (GRN) / Deliveries** — receive against a PO (warehouse). *This is the missing middle of the chain.*
- **Inspections** — QA sign‑off on what's received (already in RBAC).
- **Supplier Invoices (AP)** — match invoice ↔ PO ↔ GRN (3‑way match).
- **Payments** — pay invoices; track payables/ageing.
- **Inventory / stock ledger** — Materials has stock fields but no stock‑in/out movements.
- **Budgets** — project/department budget vs committed (PO) vs actual (invoice).

**Missing sections for CRM (none exist today):**
- **Customers / Accounts**, **Contacts**, **Leads**, **Opportunities (pipeline)**,
  **Quotations (to customers)**, **Sales Orders**, **Customer Invoices (AR)**,
  **Receipts / Collections**.

---

## 4. Closing the circle

**Procure‑to‑Pay (P2P) — the supply side, end to end:**

```
Offer / RFQ  →  Purchase Request  →  Approval  →  Purchase Order  →
Goods Receipt (GRN)  →  Inspection (QA)  →  Supplier Invoice  →
3‑way match (PO = GRN = Invoice)  →  Payment        ( ↳ Contract for framework deals )
```

**Order‑to‑Cash (O2C) — the CRM/sales side, end to end:**

```
Lead  →  Opportunity (pipeline)  →  Quotation  →  Sales Order  →
Delivery  →  Customer Invoice (AR)  →  Receipt / Collection
```

A "closed circle" means three things at each arrow:
1. **A link** — the new document stores the id of the one before (`prId`, `poId`, `grnId`, `invoiceId`).
2. **Status propagation** — approving a PR can spawn a PO; receiving a GRN moves the PO to "Received"; matching an invoice moves it to "Payable".
3. **No dead ends** — every document can answer "where did I come from?" and "what did I become?".

---

## 5. Data‑linking model (the spine)

Treat **Suppliers, Customers, Materials/Services, Projects, Users** as reference
"spine" data. **Every transaction** carries:

- `siteId` / `projectId` (scope — already present)
- `supplierId` **or** `customerId` (the party)
- the **upstream document id** (`prId` / `poId` / `grnId` / `invoiceId`)
- audit fields `createdBy / updatedBy / createdAt / updatedAt` (**already present** ✔)
- a human **document number** (`PR-2026-0001`, `PO-2026-0001`) for search & print

Keep a denormalised display field (e.g. `supplierName`) for fast lists, **but the
id is the real link**. This single convention is what makes filtering, the audit
log, and analytics all "just work".

---

## 6. Filtering, search & history (what you asked for)

Today: one text box per page. Target: a **single reusable filter bar** on every
list, plus a global lookup.

**Per‑list filters:** free text · **date range** (created/updated) · status ·
**supplier / customer** · project · **created‑by (user)** · document number ·
amount range. Combine‑able, with a result count.

**Global search:** one box that finds any document by **number** (PR/PO/Invoice),
supplier, or customer, and jumps to it.

**Saved views:** per‑user defaults ("my open PRs", "this month's POs").

**Under the hood:** add **composite Firestore indexes** for the common combos
(`siteId + status + createdAt`, `supplierId + createdAt`) so date/party filters
stay fast as data grows.

---

## 7. Audit trail — "any action by a user, recorded"

Today there are audit **stamps** (who created/updated each record) but **no
activity log**. There is an unused `nexus_activity` collection — use it.

**Plan:** centralise in the data layer (`addScoped` / `updateScoped` /
`removeScoped` already wrap every write) so **every create / update / delete /
approve emits one event**:

```
{ ts, actorUid, actorName, action: "approve",
  entity: "purchase_request", entityId, docNumber,
  siteId, summary, before?, after? }
```

Then add a read‑only **Activity / Audit** screen, filterable by **user, date
range, entity, and action** — exactly the "history by date, PO, PR, supplier,
user, time" you described. This is also your security & compliance evidence.

---

## 8. Prioritised roadmap

**Phase 1 — Close the core P2P loop (highest value)**
- Add **document numbers** + the **link fields** (`prId`, `poId`, …).
- "**Create PO from approved PR**" and "**Create GRN from PO**" actions.
- Build **Goods Receipt** + finish **Inspections**.
- Status propagation across PR → PO → GRN.

**Phase 2 — Visibility & control (cross‑cutting)**
- **Audit/activity log** + Activity screen (centralised in the data layer).
- **Shared filter bar** (date range / supplier / user / status / doc no.) on every list + global lookup.
- Composite indexes for fast filtering.

**Phase 3 — Money**
- **Supplier Invoices (AP)** + **3‑way match** + **Payments**; **Budgets** per project.

**Phase 4 — CRM (order‑to‑cash)**
- **Customers, Leads, Opportunities, Quotations, Sales Orders, AR Invoices, Receipts**.
- Add **`sales`** / **`account_manager`** roles.

**Phase 5 — Hardening**
- **Country** scoping for `country_manager`; **approval thresholds** by value.
- Move role enforcement into **`firestore.rules`** (server‑side), not just the UI.

*Recommended starting point: **Phase 1**, because it turns three disconnected
screens into one working procurement flow — the single biggest jump from
"procurement tool" to "ERP".*

---

*Prepared as a design review. Source of truth for roles is
`next/src/lib/roles.ts`; for the live system overview see
`ERP-NEXUS-OVERVIEW.md`.*
